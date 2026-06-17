import { Injectable } from '@angular/core';

import { DatabaseService } from './database-service';

// Un persona que l'utilisateur peut incarner dans une conversation : il indique au
// personnage IA qui est l'utilisateur (nom/surnoms, histoire, pouvoirs…).
export interface Persona {
  id: string;
  name: string;
  // Description libre : qui est l'utilisateur, son histoire, ses particularités…
  description: string;
  // Couleur de la pastille affichée dans la liste.
  avatarColor: string;
  createdAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class PersonaService {
  // Palette de couleurs piochée au hasard à la création d'un persona.
  private readonly colors = ["#6c5ce7", "#00b894", "#0984e3", "#e17055", "#d63031", "#fdcb6e", "#e84393"];

  constructor(
    private database: DatabaseService
  ) { }

  // Renvoie tous les personas, du plus récent au plus ancien.
  async list(): Promise<Persona[]> {
    const personas = (await this.database.getTable("personas")) || [];
    return personas.sort((a: Persona, b: Persona) => b.createdAt - a.createdAt);
  }

  // Renvoie un persona par son id, ou undefined.
  async get(id: string): Promise<Persona | undefined> {
    return await this.database.getEntryWith("personas", "id", id);
  }

  // Crée un persona et le renvoie.
  async create(name: string, description: string): Promise<Persona> {
    const persona: Persona = {
      id: this.generateId(),
      name: name,
      description: description,
      avatarColor: this.pickColor(),
      createdAt: Date.now()
    };
    return await this.database.addEntry("personas", persona);
  }

  // Met à jour le nom et la description d'un persona existant.
  async update(id: string, changes: Partial<Persona>): Promise<void> {
    await this.database.updateEntriesWith("personas", "id", id, changes);
  }

  // Supprime un persona.
  async remove(id: string): Promise<void> {
    await this.database.removeEntriesWith("personas", "id", id);
  }

  // Génère un identifiant unique.
  private generateId(): string {
    return crypto.randomUUID();
  }

  // Pioche une couleur de pastille au hasard dans la palette.
  private pickColor(): string {
    return this.colors[Math.floor(Math.random() * this.colors.length)];
  }
}
