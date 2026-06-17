import { Injectable } from '@angular/core';

import { CharacterService } from './character-service';
import { DatabaseService } from './database-service';
import { GeminiService } from './gemini-service';

import { buildGeminiContents } from '../utils/build-gemini-contents';
import { buildSystemPrompt } from '../utils/build-system-prompt';

// Un message dans une conversation. role suit les valeurs attendues par l'API Gemini.
export interface ChatMessage {
  // Identifiant stable, utilisé pour cibler un message (régénération, suppression…).
  id: string;
  role: "user" | "model";
  text: string;
  at: number;
}

// Une conversation rattachée à un personnage.
interface Conversation {
  id: string;
  characterId: string;
  messages: ChatMessage[];
}

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
    private gemini: GeminiService
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
    const systemPrompt = buildSystemPrompt({ character: character });
    const reply = await this.generateReply(systemPrompt, conversation.messages);

    // Ajoute la réponse du modèle et persiste l'ensemble.
    conversation.messages.push({ id: crypto.randomUUID(), role: "model", text: reply, at: Date.now() });
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

    // Retire la dernière réponse, puis régénère à partir de l'historique restant.
    messages.pop();
    const systemPrompt = buildSystemPrompt({ character: character });
    const reply = await this.generateReply(systemPrompt, messages);
    messages.push({ id: crypto.randomUUID(), role: "model", text: reply, at: Date.now() });
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

    const systemPrompt = buildSystemPrompt({ character: character });
    const reply = await this.generateContinuation(systemPrompt, conversation.messages);

    conversation.messages.push({ id: crypto.randomUUID(), role: "model", text: reply, at: Date.now() });
    await this.saveConversation(conversation);

    return conversation.messages;
  }

  // Choisit entre l'appel réel à Gemini et une réponse simulée (mock).
  private async generateReply(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
    if (!this.gemini.hasApiKey()) {
      return this.mockReply(messages);
    }
    const contents = buildGeminiContents(messages);
    return await this.gemini.generate(systemPrompt, contents);
  }

  // Comme generateReply, mais sans nouveau message utilisateur : on ajoute un tour
  // user transitoire (CONTINUATION_PROMPT) aux contents pour amorcer la suite.
  private async generateContinuation(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
    if (!this.gemini.hasApiKey()) {
      return this.mockContinuation();
    }
    const contents = buildGeminiContents(messages);
    contents.push({ role: "user", parts: [{ text: CONTINUATION_PROMPT }] });
    return await this.gemini.generate(systemPrompt, contents);
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

  // Crée et persiste une conversation, initialisée avec la salutation si elle est fournie.
  private async persistNewConversation(characterId: string, greeting: string): Promise<Conversation> {
    const messages: ChatMessage[] = [];
    if (greeting) {
      messages.push({ id: crypto.randomUUID(), role: "model", text: greeting, at: Date.now() });
    }
    const conversation: Conversation = { id: crypto.randomUUID(), characterId: characterId, messages: messages };
    await this.database.addEntry("conversations", conversation);
    return conversation;
  }

  private async saveConversation(conversation: Conversation): Promise<void> {
    await this.database.updateEntriesWith(
      "conversations", "characterId", conversation.characterId, { messages: conversation.messages }
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
