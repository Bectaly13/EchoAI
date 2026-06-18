import { Injectable } from '@angular/core';

import { Character, CharacterService } from './character-service';
import { DatabaseService } from './database-service';
import { GeminiService } from './gemini-service';
import { Persona, PersonaService } from './persona-service';
import { UsageService } from './usage-service';

import { buildGeminiContents } from '../utils/build-gemini-contents';
import { buildSceneImagePrompt } from '../utils/build-scene-image-prompt';
import { buildSystemPrompt } from '../utils/build-system-prompt';
import { MemoryCategory, MemoryUpdate, parseMemory } from '../utils/parse-memory';

// Un message dans une conversation. role suit les valeurs attendues par l'API Gemini.
export interface ChatMessage {
  // Identifiant stable, utilisé pour cibler un message (régénération, suppression…).
  id: string;
  role: "user" | "model";
  text: string;
  // Illustration de la scène (data URL base64) : présente sur les messages-images
  // générés par « Illustrer la scène ». Ces messages ne sont pas renvoyés au modèle texte.
  imageData?: string;
  at: number;
}

// Une entrée de mémoire permanente, transportée de prompt en prompt.
export interface MemoryEntry {
  id: string;
  category: MemoryCategory;
  value: string;
  at: number;
  // Message (du modèle) qui a produit cette entrée → permet le rollback (#3).
  sourceMessageId: string;
}

// Une conversation rattachée à un personnage.
interface Conversation {
  id: string;
  characterId: string;
  messages: ChatMessage[];
  // Persona incarné par l'utilisateur dans cette conversation (aucun si absent).
  personaId?: string;
  // Mémoire permanente accumulée au fil de la conversation.
  memory?: MemoryEntry[];
}

// Catégories de mémoire à valeur unique : une nouvelle valeur remplace l'ancienne.
const SINGLE_VALUED_CATEGORIES: MemoryCategory[] = ["location", "relationship"];
// Source d'une entrée de mémoire créée/éditée à la main : sentinelle qui ne
// correspond à aucun message, donc jamais effacée par le rollback (régénération,
// suppression). Voir applyMemoryUpdates / deleteFrom.
const MANUAL_SOURCE = "manual";
// Nombre maximum d'entrées conservées par catégorie à valeurs multiples (jalons,
// consignes), pour borner la croissance de la mémoire (budget de tokens).
const MAX_LIST_ENTRIES = 30;

// Tour utilisateur transitoire (non persisté) injecté quand l'utilisateur passe son
// tour : l'historique se termine alors par un message du modèle, or Gemini attend un
// dernier tour `user`. Ce texte amorce la suite sans polluer l'historique stocké.
const CONTINUATION_PROMPT = "[L'utilisateur passe son tour. Poursuis la scène toi-même, sans attendre de réplique de sa part.]";

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  // Service d'orchestration : construit le prompt + l'historique, appelle l'IA,
  // et persiste les messages. C'est lui que les pages utilisent (pas GeminiService).

  constructor(
    private characterService: CharacterService,
    private database: DatabaseService,
    private gemini: GeminiService,
    private personaService: PersonaService,
    private usage: UsageService
  ) { }

  // Renvoie les messages de la conversation d'un personnage (vide si aucune).
  async getMessages(characterId: string): Promise<ChatMessage[]> {
    let conversation = await this.getConversation(characterId);
    if (!conversation) {
      // À la première ouverture, on matérialise la salutation du personnage (s'il en a une).
      const greeting = await this.greetingFor(characterId);
      if (!greeting) {
        return [];
      }
      conversation = await this.persistNewConversation(characterId, greeting);
    }
    // Migration douce : attribue un id aux anciens messages qui n'en ont pas.
    if (this.ensureMessageIds(conversation.messages)) {
      await this.saveConversation(conversation);
    }
    return conversation.messages;
  }

  // Envoie un message utilisateur, obtient la réponse de l'IA, persiste les deux,
  // et renvoie le texte de la réponse.
  async send(characterId: string, text: string): Promise<string> {
    const character = await this.characterService.get(characterId);
    if (!character) {
      throw new Error("Personnage introuvable");
    }

    const conversation = await this.getOrCreateConversation(characterId);

    // Ajoute le message de l'utilisateur.
    conversation.messages.push({ id: crypto.randomUUID(), role: "user", text: text, at: Date.now() });

    // Obtient la réponse (vraie IA si clé configurée, sinon mock).
    const systemPrompt = await this.buildPrompt(character, conversation);
    const raw = await this.generateReply(systemPrompt, conversation.messages);

    // Intègre la réponse (texte nettoyé + mises à jour de mémoire), puis persiste.
    const reply = this.appendModelReply(conversation, raw);
    await this.saveConversation(conversation);

    return reply;
  }

  // Régénère la dernière réponse du modèle : la retire et en génère une nouvelle à
  // partir de l'historique restant. Ne touche jamais à la salutation « ancrée »
  // (rien ne se passe s'il n'y a pas de message utilisateur avant la réponse).
  async regenerate(characterId: string): Promise<ChatMessage[]> {
    const conversation = await this.getConversation(characterId);
    if (!conversation) {
      return [];
    }
    const messages = conversation.messages;
    const last = messages[messages.length - 1];
    const hasUserTurn = messages.some(message => message.role === "user");
    if (!last || last.role !== "model" || !hasUserTurn) {
      return messages;
    }

    const character = await this.characterService.get(characterId);
    if (!character) {
      throw new Error("Personnage introuvable");
    }

    // Retire la dernière réponse (et la mémoire qu'elle avait produite), puis régénère.
    const removed = messages.pop();
    if (removed) {
      this.forgetMemoryFrom(conversation, removed.id);
    }
    const systemPrompt = await this.buildPrompt(character, conversation);
    const raw = await this.generateReply(systemPrompt, messages);
    this.appendModelReply(conversation, raw);
    await this.saveConversation(conversation);

    return messages;
  }

  // Supprime le message ciblé et tous ceux qui le suivent (pour ne pas « trouer »
  // l'historique), puis persiste. Renvoie les messages restants.
  async deleteFrom(characterId: string, messageId: string): Promise<ChatMessage[]> {
    const conversation = await this.getConversation(characterId);
    if (!conversation) {
      return [];
    }
    const index = conversation.messages.findIndex(message => message.id === messageId);
    if (index === -1) {
      return conversation.messages;
    }
    conversation.messages.splice(index);
    // Une conversation ne se termine jamais par un message de l'utilisateur : on
    // retire le(s) message(s) `user` resté(s) en fin de liste (supprimer une réponse
    // de l'IA enlève donc aussi le message utilisateur qui l'avait déclenchée).
    while (conversation.messages.length > 0 && conversation.messages[conversation.messages.length - 1].role === "user") {
      conversation.messages.pop();
    }
    // Oublie la mémoire produite par les messages supprimés. Les entrées manuelles
    // (sourceMessageId sentinelle) sont conservées : elles ne dépendent d'aucun message.
    const remainingIds = new Set(conversation.messages.map(message => message.id));
    conversation.memory = (conversation.memory ?? []).filter(
      entry => entry.sourceMessageId === MANUAL_SOURCE || remainingIds.has(entry.sourceMessageId)
    );
    await this.saveConversation(conversation);

    return conversation.messages;
  }

  // L'utilisateur passe son tour : on génère un message supplémentaire du modèle
  // sans ajouter de message utilisateur, puis on l'ajoute et on persiste.
  async skipTurn(characterId: string): Promise<ChatMessage[]> {
    const character = await this.characterService.get(characterId);
    if (!character) {
      throw new Error("Personnage introuvable");
    }
    const conversation = await this.getOrCreateConversation(characterId);

    const systemPrompt = await this.buildPrompt(character, conversation);
    const raw = await this.generateContinuation(systemPrompt, conversation.messages);

    this.appendModelReply(conversation, raw);
    await this.saveConversation(conversation);

    return conversation.messages;
  }

  // Indique si l'illustration de scène est disponible (cf. GeminiService.imageEnabled).
  canIllustrate(): boolean {
    return this.gemini.imageEnabled();
  }

  // Génère une illustration de la scène courante et l'ajoute comme message-image,
  // puis persiste. Nécessite la génération d'image activée (indisponible sur le
  // palier gratuit) → lève sinon. Le message produit a un texte vide et porte `imageData`.
  async illustrateScene(characterId: string): Promise<ChatMessage[]> {
    if (!this.gemini.imageEnabled()) {
      throw new Error("image-disabled");
    }
    const character = await this.characterService.get(characterId);
    if (!character) {
      throw new Error("Personnage introuvable");
    }
    const conversation = await this.getOrCreateConversation(characterId);

    const prompt = buildSceneImagePrompt(character, conversation.memory ?? [], conversation.messages);
    const result = await this.gemini.generateImage(prompt);
    await this.usage.recordImage(result);
    if (result.image) {
      conversation.messages.push({ id: crypto.randomUUID(), role: "model", text: "", imageData: result.image, at: Date.now() });
      await this.saveConversation(conversation);
    }
    return conversation.messages;
  }

  // Renvoie l'id du persona incarné dans la conversation. À défaut de choix
  // explicite (conversation ancienne ou non encore créée), renvoie le persona
  // par défaut : l'utilisateur a toujours un persona actif.
  async getActivePersonaId(characterId: string): Promise<string | undefined> {
    const conversation = await this.getConversation(characterId);
    if (conversation?.personaId) {
      return conversation.personaId;
    }
    return (await this.personaService.getDefault())?.id;
  }

  // Définit le persona incarné dans la conversation (undefined pour « aucun »).
  async setActivePersona(characterId: string, personaId: string | undefined): Promise<void> {
    await this.getOrCreateConversation(characterId);
    await this.database.updateEntriesWith(
      "conversations", "characterId", characterId, { personaId: personaId }
    );
  }

  // ----- Prompt et mémoire permanente -----

  // Assemble le prompt système pour cette conversation (personnage + persona + mémoire).
  private async buildPrompt(character: Character, conversation: Conversation): Promise<string> {
    const persona = await this.personaFor(conversation);
    return buildSystemPrompt({ character: character, persona: persona, memory: conversation.memory });
  }

  // Intègre une réponse brute du modèle : extrait l'éventuel bloc mémoire, ajoute le
  // message (texte nettoyé) et applique les mises à jour. Renvoie le texte affiché.
  private appendModelReply(conversation: Conversation, raw: string): string {
    const parsed = parseMemory(raw);
    const messageId = crypto.randomUUID();
    conversation.messages.push({ id: messageId, role: "model", text: parsed.text, at: Date.now() });
    this.applyMemoryUpdates(conversation, parsed.updates, messageId);
    return parsed.text;
  }

  // Applique les mises à jour de mémoire : remplace pour les catégories à valeur
  // unique, ajoute (en bornant) pour les catégories à valeurs multiples.
  private applyMemoryUpdates(conversation: Conversation, updates: MemoryUpdate[], sourceMessageId: string): void {
    if (updates.length === 0) {
      return;
    }
    let memory = conversation.memory ? [...conversation.memory] : [];
    for (const update of updates) {
      if (SINGLE_VALUED_CATEGORIES.includes(update.category)) {
        memory = memory.filter(entry => entry.category !== update.category);
      }
      memory.push({
        id: crypto.randomUUID(),
        category: update.category,
        value: update.value,
        at: Date.now(),
        sourceMessageId: sourceMessageId
      });
    }
    conversation.memory = this.capMemory(memory);
  }

  // Retire les entrées de mémoire produites par un message donné (rollback).
  private forgetMemoryFrom(conversation: Conversation, messageId: string): void {
    if (!conversation.memory) {
      return;
    }
    conversation.memory = conversation.memory.filter(entry => entry.sourceMessageId !== messageId);
  }

  // Borne chaque catégorie à valeurs multiples à ses MAX_LIST_ENTRIES plus récentes,
  // en préservant l'ordre chronologique.
  private capMemory(memory: MemoryEntry[]): MemoryEntry[] {
    const counts = new Map<MemoryCategory, number>();
    const kept: MemoryEntry[] = [];
    // On parcourt du plus récent au plus ancien pour garder les derniers.
    for (let i = memory.length - 1; i >= 0; i--) {
      const entry = memory[i];
      if (SINGLE_VALUED_CATEGORIES.includes(entry.category)) {
        kept.push(entry);
        continue;
      }
      const count = counts.get(entry.category) ?? 0;
      if (count < MAX_LIST_ENTRIES) {
        counts.set(entry.category, count + 1);
        kept.push(entry);
      }
    }
    return kept.reverse();
  }

  // Renvoie la mémoire permanente de la conversation (vide si aucune).
  async getMemory(characterId: string): Promise<MemoryEntry[]> {
    const conversation = await this.getConversation(characterId);
    return conversation?.memory ?? [];
  }

  // Ajoute manuellement une entrée de mémoire (catégorie + valeur) et renvoie la
  // mémoire mise à jour. Suit les mêmes règles que la mémoire automatique
  // (catégorie à valeur unique → remplacement ; à valeurs multiples → ajout borné).
  async addMemoryEntry(characterId: string, category: MemoryCategory, value: string): Promise<MemoryEntry[]> {
    const conversation = await this.getConversation(characterId);
    if (!conversation) {
      return [];
    }
    const text = value.trim();
    if (!text) {
      return conversation.memory ?? [];
    }
    this.applyMemoryUpdates(conversation, [{ category: category, value: text }], MANUAL_SOURCE);
    await this.saveConversation(conversation);
    return conversation.memory ?? [];
  }

  // Modifie la valeur d'une entrée de mémoire existante. L'entrée devient
  // « manuelle » (protégée du rollback), l'utilisateur en ayant pris possession.
  async updateMemoryEntry(characterId: string, entryId: string, value: string): Promise<MemoryEntry[]> {
    const conversation = await this.getConversation(characterId);
    if (!conversation || !conversation.memory) {
      return [];
    }
    const text = value.trim();
    const entry = conversation.memory.find(item => item.id === entryId);
    if (!entry || !text) {
      return conversation.memory;
    }
    entry.value = text;
    entry.sourceMessageId = MANUAL_SOURCE;
    await this.saveConversation(conversation);
    return conversation.memory;
  }

  // Supprime une entrée de mémoire et renvoie la mémoire restante.
  async deleteMemoryEntry(characterId: string, entryId: string): Promise<MemoryEntry[]> {
    const conversation = await this.getConversation(characterId);
    if (!conversation || !conversation.memory) {
      return [];
    }
    conversation.memory = conversation.memory.filter(entry => entry.id !== entryId);
    await this.saveConversation(conversation);
    return conversation.memory;
  }

  // Vide toute la mémoire permanente de la conversation.
  async clearMemory(characterId: string): Promise<void> {
    const conversation = await this.getConversation(characterId);
    if (!conversation) {
      return;
    }
    conversation.memory = [];
    await this.saveConversation(conversation);
  }

  // Choisit entre l'appel réel à Gemini et une réponse simulée (mock).
  private async generateReply(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
    if (!this.gemini.hasApiKey()) {
      return this.mockReply(messages);
    }
    const contents = buildGeminiContents(messages);
    const result = await this.gemini.generate(systemPrompt, contents);
    await this.usage.recordText(result);
    return result.text;
  }

  // Comme generateReply, mais sans nouveau message utilisateur : on ajoute un tour
  // user transitoire (CONTINUATION_PROMPT) aux contents pour amorcer la suite.
  private async generateContinuation(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
    if (!this.gemini.hasApiKey()) {
      return this.mockContinuation();
    }
    const contents = buildGeminiContents(messages);
    contents.push({ role: "user", parts: [{ text: CONTINUATION_PROMPT }] });
    const result = await this.gemini.generate(systemPrompt, contents);
    await this.usage.recordText(result);
    return result.text;
  }

  // Réponse bidon utilisée tant qu'aucune clé API n'est configurée.
  private mockReply(messages: ChatMessage[]): string {
    const last = messages[messages.length - 1];
    return `(réponse simulée) Tu as dit : "${last.text}". Renseigne ta clé Gemini dans environment.ts pour une vraie réponse.`;
  }

  // Réponse bidon pour un tour passé (sans clé API configurée).
  private mockContinuation(): string {
    return "(réponse simulée) Le personnage poursuit la scène. Renseigne ta clé Gemini dans environment.ts pour une vraie réponse.";
  }

  // ----- Persistance des conversations -----

  private async getConversation(characterId: string): Promise<Conversation | undefined> {
    return await this.database.getEntryWith("conversations", "characterId", characterId);
  }

  // Renvoie la conversation du personnage, en la créant (avec sa salutation) si besoin.
  private async getOrCreateConversation(characterId: string): Promise<Conversation> {
    const conversation = await this.getConversation(characterId);
    if (conversation) {
      return conversation;
    }
    const greeting = await this.greetingFor(characterId);
    return await this.persistNewConversation(characterId, greeting);
  }

  // Renvoie la salutation (nettoyée) du personnage, ou "" s'il n'en a pas.
  private async greetingFor(characterId: string): Promise<string> {
    const character = await this.characterService.get(characterId);
    return character?.greeting?.trim() ?? "";
  }

  // Renvoie le persona incarné dans la conversation. À défaut de choix explicite
  // (ou si le persona choisi a été supprimé), on retombe sur le persona par défaut
  // « Moi » → l'utilisateur a toujours un persona transmis à l'IA.
  private async personaFor(conversation: Conversation): Promise<Persona | undefined> {
    if (conversation.personaId) {
      const persona = await this.personaService.get(conversation.personaId);
      if (persona) {
        return persona;
      }
    }
    return await this.personaService.getDefault();
  }

  // Crée et persiste une conversation, initialisée avec la salutation si elle est
  // fournie, et avec le persona par défaut comme persona actif.
  private async persistNewConversation(characterId: string, greeting: string): Promise<Conversation> {
    const messages: ChatMessage[] = [];
    if (greeting) {
      messages.push({ id: crypto.randomUUID(), role: "model", text: greeting, at: Date.now() });
    }
    const defaultPersona = await this.personaService.getDefault();
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      characterId: characterId,
      messages: messages,
      personaId: defaultPersona?.id
    };
    await this.database.addEntry("conversations", conversation);
    return conversation;
  }

  private async saveConversation(conversation: Conversation): Promise<void> {
    await this.database.updateEntriesWith(
      "conversations", "characterId", conversation.characterId,
      { messages: conversation.messages, memory: conversation.memory ?? [] }
    );
  }

  // Attribue un id aux messages qui n'en ont pas. Renvoie true si au moins un a été modifié.
  private ensureMessageIds(messages: ChatMessage[]): boolean {
    let changed = false;
    for (const message of messages) {
      if (!message.id) {
        message.id = crypto.randomUUID();
        changed = true;
      }
    }
    return changed;
  }
}
