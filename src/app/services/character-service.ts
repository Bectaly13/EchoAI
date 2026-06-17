import { Injectable } from '@angular/core';

import { DatabaseService } from './database-service';

// Un personnage créé par l'utilisateur.
export interface Character {
  id: string;
  name: string;
  // Instructions de personnalité envoyées à l'IA comme "system prompt".
  systemPrompt: string;
  // Message d'accueil du personnage : premier message (côté IA) de toute conversation,
  // sert à planter le décor. Optionnel (vide = pas de premier message imposé).
  greeting: string;
  // Couleur de l'avatar (pastille colorée affichée dans la liste).
  avatarColor: string;
  createdAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class CharacterService {
  // Palette de couleurs piochée au hasard à la création d'un personnage.
  private readonly colors = ["#6c5ce7", "#00b894", "#0984e3", "#e17055", "#d63031", "#fdcb6e", "#e84393"];

  constructor(
    private database: DatabaseService
  ) { }

  // Renvoie tous les personnages, du plus récent au plus ancien.
  async list(): Promise<Character[]> {
    const characters = (await this.database.getTable("characters")) || [];
    return characters.sort((a: Character, b: Character) => b.createdAt - a.createdAt);
  }

  // Renvoie un personnage par son id, ou undefined.
  async get(id: string): Promise<Character | undefined> {
    return await this.database.getEntryWith("characters", "id", id);
  }

  // Crée un personnage et le renvoie.
  async create(name: string, systemPrompt: string, greeting: string): Promise<Character> {
    const character: Character = {
      id: this.generateId(),
      name: name,
      systemPrompt: systemPrompt,
      greeting: greeting,
      avatarColor: this.pickColor(),
      createdAt: Date.now()
    };
    return await this.database.addEntry("characters", character);
  }

  // Met à jour le nom et la personnalité d'un personnage existant.
  async update(id: string, changes: Partial<Character>): Promise<void> {
    await this.database.updateEntriesWith("characters", "id", id, changes);
  }

  // Supprime un personnage et la conversation associée.
  async remove(id: string): Promise<void> {
    await this.database.removeEntriesWith("characters", "id", id);
    await this.database.removeEntriesWith("conversations", "characterId", id);
  }

  // Génère un identifiant unique.
  private generateId(): string {
    return crypto.randomUUID();
  }

  // Pioche une couleur d'avatar au hasard dans la palette.
  private pickColor(): string {
    return this.colors[Math.floor(Math.random() * this.colors.length)];
  }
}
