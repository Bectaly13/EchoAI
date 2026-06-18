import { Injectable } from '@angular/core';

import { DatabaseService } from './database-service';
import { StorageService } from './storage-service';

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
  // Persona par défaut « Moi » : toujours présent, toujours actif par défaut,
  // non supprimable. L'utilisateur a donc toujours un persona dans une conversation.
  isDefault?: boolean;
}

// Nom initial du persona par défaut (l'utilisateur est invité à le renommer).
const DEFAULT_PERSONA_NAME = "Moi";
// Clé de stockage : indique si on a déjà proposé à l'utilisateur de nommer son persona.
const NAME_PROMPTED_KEY = "defaultPersonaNamed";

@Injectable({
  providedIn: 'root',
})
export class PersonaService {
  // Palette de couleurs piochée au hasard à la création d'un persona.
  private readonly colors = ["#6c5ce7", "#00b894", "#0984e3", "#e17055", "#d63031", "#fdcb6e", "#e84393"];

  constructor(
    private database: DatabaseService,
    private storage: StorageService
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

  // Renvoie le persona par défaut (« Moi »), ou undefined s'il n'existe pas encore.
  async getDefault(): Promise<Persona | undefined> {
    const personas = (await this.database.getTable("personas")) || [];
    return personas.find((persona: Persona) => persona.isDefault);
  }

  // Garantit l'existence du persona par défaut (idempotent). Appelé au démarrage,
  // après les migrations, pour les nouveaux comme les anciens utilisateurs.
  async ensureDefault(): Promise<Persona> {
    const existing = await this.getDefault();
    if (existing) {
      return existing;
    }
    const persona: Persona = {
      id: this.generateId(),
      name: DEFAULT_PERSONA_NAME,
      description: "",
      avatarColor: this.pickColor(),
      createdAt: Date.now(),
      isDefault: true
    };
    return await this.database.addEntry("personas", persona);
  }

  // Indique si l'utilisateur a déjà été invité (une fois) à nommer son persona.
  async hasPromptedName(): Promise<boolean> {
    return !!(await this.storage.get(NAME_PROMPTED_KEY));
  }

  // Mémorise qu'on a proposé de nommer le persona (pour ne plus le redemander).
  async markNamePrompted(): Promise<void> {
    await this.storage.set(NAME_PROMPTED_KEY, true);
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

  // Supprime un persona. Le persona par défaut n'est pas supprimable (ignoré).
  async remove(id: string): Promise<void> {
    const persona = await this.get(id);
    if (persona?.isDefault) {
      return;
    }
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
