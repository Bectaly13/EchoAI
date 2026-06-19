import { Injectable } from '@angular/core';

import { DatabaseService } from './database-service';
import { GeminiService } from './gemini-service';
import { ImageService } from './image-service';
import { UsageService } from './usage-service';

import { buildDraftPrompt, CHARACTER_DRAFT_SCHEMA } from 'src/app/utils/build-draft-prompt';
import { buildImagePrompt } from 'src/app/utils/build-image-prompt';

// Un personnage créé par l'utilisateur.
export interface Character {
  id: string;
  name: string;
  // Personnalité : description principale envoyée à l'IA comme "system prompt".
  systemPrompt: string;
  // Message d'accueil du personnage : premier message (côté IA) de toute conversation,
  // sert à planter le décor. Optionnel (vide = pas de premier message imposé).
  greeting: string;
  // Champs structurés optionnels, ajoutés à la fiche envoyée à l'IA s'ils sont remplis.
  appearance?: string;            // apparence physique
  initialRelationship?: string;   // relation initiale avec l'utilisateur
  likes?: string;                 // goûts et préférences
  dislikes?: string;              // ce qu'il n'aime pas
  knownCharacters?: string;       // autres personnages qu'il connaît
  // Photo de profil générée par l'IA, stockée en data URL base64. Optionnelle :
  // à défaut, la pastille de couleur (avatarColor) sert d'avatar.
  avatarImage?: string;
  // Couleur de l'avatar (pastille colorée affichée dans la liste).
  avatarColor: string;
  createdAt: number;
}

// Champs éditables d'un personnage (saisis dans le formulaire de création/édition).
export type CharacterDraft = Pick<
  Character,
  "name" | "systemPrompt" | "greeting" | "appearance" | "initialRelationship" | "likes" | "dislikes" | "knownCharacters" | "avatarImage"
>;

@Injectable({
  providedIn: 'root',
})
export class CharacterService {
  // Palette de couleurs piochée au hasard à la création d'un personnage.
  private readonly colors = ["#6c5ce7", "#00b894", "#0984e3", "#e17055", "#d63031", "#fdcb6e", "#e84393"];

  constructor(
    private database: DatabaseService,
    private gemini: GeminiService,
    private image: ImageService,
    private usage: UsageService
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
  async create(draft: CharacterDraft): Promise<Character> {
    const character: Character = {
      id: this.generateId(),
      avatarColor: this.pickColor(),
      createdAt: Date.now(),
      ...draft
    };
    return await this.database.addEntry("characters", character);
  }

  // Génère une fiche de personnage structurée à partir d'un brouillon libre.
  // Renvoie les champs éditables à pré-remplir dans le formulaire (résultat
  // toujours retouchable par l'utilisateur). Retombe sur un mock sans clé API.
  async draftFromBrief(brief: string): Promise<CharacterDraft> {
    const text = brief.trim();
    if (!this.gemini.hasApiKey()) {
      return this.mockDraft(text);
    }
    const result = await this.gemini.generateStructured(buildDraftPrompt(text), CHARACTER_DRAFT_SCHEMA);
    // Comptabilise cet appel (auparavant non suivi) dans le suivi d'utilisation.
    await this.usage.recordText(result);
    return this.normalizeDraft(result.data);
  }

  // Convertit la réponse brute de l'IA en CharacterDraft (champs manquants → "").
  private normalizeDraft(result: any): CharacterDraft {
    const value = (key: string): string => (typeof result?.[key] === "string" ? result[key].trim() : "");
    return {
      name: value("name"),
      systemPrompt: value("systemPrompt"),
      greeting: value("greeting"),
      appearance: value("appearance"),
      initialRelationship: value("initialRelationship"),
      likes: value("likes"),
      dislikes: value("dislikes"),
      knownCharacters: value("knownCharacters")
    };
  }

  // Fiche simulée quand aucune clé API n'est configurée (mode démo).
  private mockDraft(brief: string): CharacterDraft {
    return {
      name: "Personnage (démo)",
      systemPrompt: brief || "Personnalité à compléter.",
      greeting: "",
      appearance: "",
      initialRelationship: "",
      likes: "",
      dislikes: "",
      knownCharacters: ""
    };
  }

  // Indique si la génération d'avatar est disponible (clés Cloudflare configurées).
  canGenerateImage(): boolean {
    return this.image.enabled();
  }

  // Génère une photo de profil (data URL) à partir des champs de la fiche.
  // Nécessite la génération d'image configurée → lève sinon.
  async generateAvatar(fields: { name?: string; appearance?: string; systemPrompt?: string }): Promise<string> {
    if (!this.image.enabled()) {
      throw new Error("image-disabled");
    }
    const result = await this.image.generate(buildImagePrompt(fields));
    await this.usage.recordImage(result.model);
    return result.image;
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
