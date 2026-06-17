import { Injectable } from '@angular/core';

import { CharacterService } from './character-service';
import { DatabaseService } from './database-service';
import { GeminiService } from './gemini-service';

import { buildGeminiContents } from '../utils/build-gemini-contents';

// Un message dans une conversation. role suit les valeurs attendues par l'API Gemini.
export interface ChatMessage {
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
    const conversation = await this.getConversation(characterId);
    return conversation ? conversation.messages : [];
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
    conversation.messages.push({ role: "user", text: text, at: Date.now() });

    // Obtient la réponse (vraie IA si clé configurée, sinon mock).
    const reply = await this.generateReply(character.systemPrompt, conversation.messages);

    // Ajoute la réponse du modèle et persiste l'ensemble.
    conversation.messages.push({ role: "model", text: reply, at: Date.now() });
    await this.saveConversation(conversation);

    return reply;
  }

  // Choisit entre l'appel réel à Gemini et une réponse simulée (mock).
  private async generateReply(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
    if (!this.gemini.hasApiKey()) {
      return this.mockReply(messages);
    }
    const contents = buildGeminiContents(messages);
    return await this.gemini.generate(systemPrompt, contents);
  }

  // Réponse bidon utilisée tant qu'aucune clé API n'est configurée.
  private mockReply(messages: ChatMessage[]): string {
    const last = messages[messages.length - 1];
    return `(réponse simulée) Tu as dit : "${last.text}". Renseigne ta clé Gemini dans environment.ts pour une vraie réponse.`;
  }

  // ----- Persistance des conversations -----

  private async getConversation(characterId: string): Promise<Conversation | undefined> {
    return await this.database.getEntryWith("conversations", "characterId", characterId);
  }

  // Renvoie la conversation du personnage, en la créant si elle n'existe pas encore.
  private async getOrCreateConversation(characterId: string): Promise<Conversation> {
    let conversation = await this.getConversation(characterId);
    if (!conversation) {
      conversation = { id: crypto.randomUUID(), characterId: characterId, messages: [] };
      await this.database.addEntry("conversations", conversation);
    }
    return conversation;
  }

  private async saveConversation(conversation: Conversation): Promise<void> {
    await this.database.updateEntriesWith(
      "conversations", "characterId", conversation.characterId, { messages: conversation.messages }
    );
  }
}
