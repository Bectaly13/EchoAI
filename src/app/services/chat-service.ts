import { Injectable } from '@angular/core';

import { Character, CharacterService } from './character-service';
import { DatabaseService } from './database-service';
import { GeminiService } from './gemini-service';
import { ImageService } from './image-service';
import { Persona, PersonaService } from './persona-service';
import { UsageService } from './usage-service';

import { buildGeminiContents } from '../utils/build-gemini-contents';
import { buildSceneImageInstruction, SCENE_IMAGE_SCHEMA } from '../utils/build-scene-image-instruction';
import { buildSystemPrompt } from '../utils/build-system-prompt';
import { interpolateTags } from '../utils/interpolate-tags';
import { MemoryCategory, parseMemory } from '../utils/parse-memory';

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
  // Id du message du modèle qui a produit ce jalon (catégorie "milestone" uniquement),
  // pour le rembobinage : le jalon est retiré quand son message source est supprimé.
  // Absent pour les jalons ajoutés à la main et pour les catégories réémises
  // (location, situation, relationship, instruction), qui se rembobinent par remplacement.
  sourceMessageId?: string;
}

// Résumé d'une conversation, pour la liste des conversations (page dédiée).
export interface ConversationSummary {
  characterId: string;
  characterName: string;
  // Avatar du personnage : photo de profil si présente, sinon pastille de couleur.
  avatarColor: string;
  avatarImage?: string;
  // Aperçu du dernier message (texte ; « [image] » pour une illustration).
  lastMessage: string;
  // Date du dernier message, pour le tri par récence.
  at: number;
}

// Aperçu d'un personnage dont la conversation incarne un persona donné
// (pour l'écran d'édition de persona : photo/pastille + nom).
export interface PersonaUsage {
  characterName: string;
  avatarColor: string;
  avatarImage?: string;
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

// Tour utilisateur transitoire (non persisté) injecté quand l'utilisateur passe son
// tour : l'historique se termine alors par un message du modèle, or Gemini attend un
// dernier tour `user`. Ce texte amorce la suite sans polluer l'historique stocké.
const CONTINUATION_PROMPT = "[L'utilisateur passe son tour. Poursuis la scène toi-même, sans attendre de réplique de sa part.]";

// Nombre maximal de re-tirages quand l'IA renvoie un texte vide (typiquement un blocage
// PROHIBITED_CONTENT non configurable côté Google) : re-tirer change l'échantillonnage et
// finit généralement par produire une réponse. Au-delà, on remonte une erreur "empty-response".
const MAX_EMPTY_RETRIES = 3;

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
    private image: ImageService,
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

  // Renvoie un résumé de chaque conversation existante (nom du personnage +
  // aperçu du dernier message), trié du plus récent au plus ancien. Les
  // conversations dont le personnage a été supprimé sont ignorées.
  async listConversations(): Promise<ConversationSummary[]> {
    const conversations: Conversation[] = (await this.database.getTable("conversations")) || [];
    const summaries: ConversationSummary[] = [];
    for (const conversation of conversations) {
      const character = await this.characterService.get(conversation.characterId);
      if (!character) {
        continue;
      }
      const last = conversation.messages[conversation.messages.length - 1];
      const lastMessage = last ? (last.text || (last.imageData ? "[image]" : "")) : "";
      summaries.push({
        characterId: conversation.characterId,
        characterName: character.name,
        avatarColor: character.avatarColor,
        avatarImage: character.avatarImage,
        lastMessage: lastMessage,
        at: last?.at ?? 0
      });
    }
    return summaries.sort((a, b) => b.at - a.at);
  }

  // Renvoie les personnages (nom + avatar) dont la conversation incarne ce persona
  // (pour informer, à l'édition d'un persona, où il est actif).
  async conversationsUsingPersona(personaId: string): Promise<PersonaUsage[]> {
    const conversations: Conversation[] = (await this.database.getTable("conversations")) || [];
    const usages: PersonaUsage[] = [];
    for (const conversation of conversations) {
      if (conversation.personaId !== personaId) {
        continue;
      }
      const character = await this.characterService.get(conversation.characterId);
      if (character) {
        usages.push({
          characterName: character.name,
          avatarColor: character.avatarColor,
          avatarImage: character.avatarImage
        });
      }
    }
    return usages;
  }

  // Supprime entièrement la conversation d'un personnage (messages + mémoire),
  // sans supprimer le personnage lui-même.
  async deleteConversation(characterId: string): Promise<void> {
    await this.database.removeEntriesWith("conversations", "characterId", characterId);
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
  // (le premier message n'est pas régénérable).
  async regenerate(characterId: string): Promise<ChatMessage[]> {
    const conversation = await this.getConversation(characterId);
    if (!conversation) {
      return [];
    }
    const messages = conversation.messages;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "model" || last === messages[0]) {
      return messages;
    }

    const character = await this.characterService.get(characterId);
    if (!character) {
      throw new Error("Personnage introuvable");
    }

    // Retire la dernière réponse, puis régénère : l'état courant (lieu/situation/
    // relation/consignes) sera remplacé par la nouvelle réponse. Le(s) jalon(s)
    // produit(s) par la réponse écartée sont rembobinés (la nouvelle réponse pourra en
    // reproposer) : sinon ils resteraient rattachés à un message qui n'existe plus.
    messages.pop();
    this.forgetMilestonesFrom(conversation, new Set([last.id]));
    const systemPrompt = await this.buildPrompt(character, conversation);
    // Les messages-images sont filtrés de l'historique transmis ; on regarde donc le
    // dernier tour réellement envoyé au modèle. S'il ne vient pas de l'utilisateur
    // (ex. régénération d'un message « passer son tour », ou juste après une image),
    // on amorce comme une continuation — sinon le modèle reçoit un historique se
    // terminant par un tour « model » et renvoie une réponse vide.
    const lastSent = [...messages].reverse().find(message => !message.imageData);
    const raw = lastSent && lastSent.role === "user"
      ? await this.generateReply(systemPrompt, messages)
      : await this.generateContinuation(systemPrompt, messages);
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
    // Index introuvable, ou premier message (la salutation, non supprimable :
    // utiliser « Réinitialiser la conversation » pour repartir de zéro).
    if (index <= 0) {
      return conversation.messages;
    }
    // Ids de tous les messages retirés (la tranche supprimée + les messages `user`
    // restés en fin de liste) → pour rembobiner les jalons qui en sont issus.
    const removedIds = new Set(conversation.messages.slice(index).map(message => message.id));
    conversation.messages.splice(index);
    // Une conversation ne se termine jamais par un message de l'utilisateur : on
    // retire le(s) message(s) `user` resté(s) en fin de liste (supprimer une réponse
    // de l'IA enlève donc aussi le message utilisateur qui l'avait déclenchée).
    while (conversation.messages.length > 0 && conversation.messages[conversation.messages.length - 1].role === "user") {
      removedIds.add(conversation.messages[conversation.messages.length - 1].id);
      conversation.messages.pop();
    }
    // Les catégories réémises (lieu/situation/relation/consignes) ne sont pas rembobinées
    // (le modèle les reconsolide au tour suivant) ; les jalons, eux, sont en delta et ne
    // se reconsolident jamais → on retire ceux nés dans les messages supprimés.
    this.forgetMilestonesFrom(conversation, removedIds);
    await this.saveConversation(conversation);

    return conversation.messages;
  }

  // Retire les jalons dont le message source fait partie des messages supprimés. Les
  // autres catégories, et les jalons sans source (ajoutés à la main, ou antérieurs au
  // suivi de provenance), sont conservés tels quels.
  private forgetMilestonesFrom(conversation: Conversation, removedIds: Set<string>): void {
    if (!conversation.memory) {
      return;
    }
    conversation.memory = conversation.memory.filter(entry =>
      entry.category !== "milestone" || !entry.sourceMessageId || !removedIds.has(entry.sourceMessageId)
    );
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

  // Indique si l'illustration de scène est disponible (génération d'image configurée).
  canIllustrate(): boolean {
    return this.image.enabled();
  }

  // Génère une illustration de la scène courante et l'ajoute comme message-image,
  // puis persiste. Nécessite la génération d'image configurée → lève sinon.
  // Le message produit a un texte vide et porte `imageData`.
  async illustrateScene(characterId: string): Promise<ChatMessage[]> {
    if (!this.image.enabled()) {
      throw new Error("image-disabled");
    }
    const character = await this.characterService.get(characterId);
    if (!character) {
      throw new Error("Personnage introuvable");
    }
    const conversation = await this.getOrCreateConversation(characterId);

    const prompt = await this.buildScenePrompt(character, conversation);
    let result;
    try {
      result = await this.image.generate(prompt);
    } catch (error) {
      // Quota de neurons Cloudflare dépassé : on marque le modèle image épuisé.
      if ((error as { quotaExceeded?: boolean })?.quotaExceeded) {
        await this.usage.markImageExhausted();
      }
      throw error;
    }
    await this.usage.recordImage(result.model, result.neurons);
    if (result.image) {
      conversation.messages.push({ id: crypto.randomUUID(), role: "model", text: "", imageData: result.image, at: Date.now() });
      await this.saveConversation(conversation);
    }
    return conversation.messages;
  }

  // Réinitialise complètement la conversation : efface tous les messages ET la
  // mémoire permanente, puis remet la salutation. Le persona actif est conservé.
  async resetConversation(characterId: string): Promise<ChatMessage[]> {
    const conversation = await this.getOrCreateConversation(characterId);
    const greeting = await this.greetingFor(characterId);
    const persona = await this.personaFor(conversation);
    const text = await this.interpolateGreeting(characterId, greeting, persona);
    conversation.messages = text
      ? [{ id: crypto.randomUUID(), role: "model", text: text, at: Date.now() }]
      : [];
    conversation.memory = [];
    await this.saveConversation(conversation);
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

  // Pipeline IA-IA : demande à Gemini de transformer le contexte courant (personnage, persona,
  // mémoire, derniers messages) en un prompt text-to-image pertinent, en anglais et épuré (SFW).
  // Comptabilise la requête. Lève si Gemini ne renvoie pas de prompt exploitable (illustration
  // impossible) — pas de repli déterministe (cf. décision : on passe uniquement par Gemini).
  private async buildScenePrompt(character: Character, conversation: Conversation): Promise<string> {
    const persona = await this.personaFor(conversation);
    const instruction = buildSceneImageInstruction(character, persona, conversation.memory ?? [], conversation.messages);
    const result = await this.gemini.generateStructured(instruction, SCENE_IMAGE_SCHEMA);
    await this.usage.recordText(result);
    const prompt = (result.data?.imagePrompt ?? "").trim();
    if (!prompt) {
      throw new Error("empty-image-prompt");
    }
    return prompt;
  }

  // Intègre une réponse brute du modèle : ajoute le message (texte nettoyé) et, si la
  // réponse réémet un bloc mémoire, met la mémoire à jour. Deux régimes coexistent :
  // - location/situation/relationship/instruction : REMPLACÉS par l'état complet
  //   réémis par le modèle (le modèle fusionne et retire l'obsolète lui-même) ;
  // - milestone : régime DELTA — le modèle n'émet que les nouveaux jalons du tour ;
  //   on CONSERVE les jalons existants et on AJOUTE les nouveaux (anti-doublon exact),
  //   sans jamais demander au modèle de recopier le journal (qu'il finissait par fusionner).
  private appendModelReply(conversation: Conversation, raw: string): string {
    const parsed = parseMemory(raw);
    // Id du message créé : sert à rattacher les nouveaux jalons à leur message source.
    const messageId = crypto.randomUUID();
    conversation.messages.push({ id: messageId, role: "model", text: parsed.text, at: Date.now() });
    if (parsed.hasMemoryBlock) {
      const existingMilestones = (conversation.memory ?? []).filter(entry => entry.category === "milestone");
      const replaced = parsed.entries
        .filter(line => line.category !== "milestone")
        .map(line => this.toMemoryEntry(line.category, line.value));
      const knownValues = new Set(existingMilestones.map(entry => entry.value));
      const newMilestones = parsed.entries
        .filter(line => line.category === "milestone" && !knownValues.has(line.value))
        .map(line => this.toMemoryEntry(line.category, line.value, messageId));
      conversation.memory = [...replaced, ...existingMilestones, ...newMilestones];
    }
    return parsed.text;
  }

  // Fabrique une entrée de mémoire datée. sourceMessageId n'est renseigné que pour les
  // jalons issus d'une réponse du modèle (rembobinage) ; absent partout ailleurs.
  private toMemoryEntry(category: MemoryCategory, value: string, sourceMessageId?: string): MemoryEntry {
    return { id: crypto.randomUUID(), category: category, value: value, at: Date.now(), sourceMessageId: sourceMessageId };
  }

  // Renvoie la mémoire permanente de la conversation (vide si aucune).
  async getMemory(characterId: string): Promise<MemoryEntry[]> {
    const conversation = await this.getConversation(characterId);
    return conversation?.memory ?? [];
  }

  // Ajoute manuellement une entrée de mémoire (catégorie + valeur) et renvoie la
  // mémoire mise à jour. Le modèle la conservera lors de ses réémissions (sauf
  // obsolescence) et consolidera au besoin au tour suivant.
  async addMemoryEntry(characterId: string, category: MemoryCategory, value: string): Promise<MemoryEntry[]> {
    const conversation = await this.getConversation(characterId);
    if (!conversation) {
      return [];
    }
    const text = value.trim();
    if (!text) {
      return conversation.memory ?? [];
    }
    conversation.memory = [
      ...(conversation.memory ?? []),
      { id: crypto.randomUUID(), category: category, value: text, at: Date.now() }
    ];
    await this.saveConversation(conversation);
    return conversation.memory;
  }

  // Modifie la valeur d'une entrée de mémoire existante.
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
    return await this.generateText(systemPrompt, contents);
  }

  // Comme generateReply, mais sans nouveau message utilisateur : on ajoute un tour
  // user transitoire (CONTINUATION_PROMPT) aux contents pour amorcer la suite.
  private async generateContinuation(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
    if (!this.gemini.hasApiKey()) {
      return this.mockContinuation();
    }
    const contents = buildGeminiContents(messages);
    contents.push({ role: "user", parts: [{ text: CONTINUATION_PROMPT }] });
    return await this.generateText(systemPrompt, contents);
  }

  // Appelle Gemini en comptabilisant CHAQUE requête réelle, et re-tire jusqu'à
  // MAX_EMPTY_RETRIES fois tant que le texte revient vide (blocage PROHIBITED_CONTENT
  // non configurable côté Google : re-tirer change l'échantillonnage). Lève
  // "empty-response" si tous les essais sont vides → l'appelant ne persiste alors aucun
  // message vide et la page affiche une erreur explicite.
  private async generateText(systemPrompt: string, contents: any[]): Promise<string> {
    for (let attempt = 0; attempt <= MAX_EMPTY_RETRIES; attempt++) {
      const result = await this.gemini.generate(systemPrompt, contents);
      await this.usage.recordText(result);
      if (result.text.trim()) {
        return result.text;
      }
    }
    throw new Error("empty-response");
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

  // Interpole les balises {char}/{user} de la salutation avec le nom du personnage et
  // celui du persona donné, pour produire le texte du premier message affiché. La
  // salutation est ainsi figée avec le persona du moment (cf. limite assumée).
  private async interpolateGreeting(characterId: string, greeting: string, persona: Persona | undefined): Promise<string> {
    if (!greeting) {
      return greeting;
    }
    const character = await this.characterService.get(characterId);
    const userName = persona?.name?.trim() || "l'utilisateur";
    return interpolateTags(greeting, character?.name ?? "", userName);
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
    const defaultPersona = await this.personaService.getDefault();
    const messages: ChatMessage[] = [];
    if (greeting) {
      const text = await this.interpolateGreeting(characterId, greeting, defaultPersona);
      messages.push({ id: crypto.randomUUID(), role: "model", text: text, at: Date.now() });
    }
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
