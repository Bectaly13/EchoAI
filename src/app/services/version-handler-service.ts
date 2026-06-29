import { Injectable } from '@angular/core';

import { DatabaseService } from './database-service';
import { StorageService } from './storage-service';

@Injectable({
  providedIn: 'root',
})
export class VersionHandlerService {
  // Gère les montées de version du format de la bdd : pose la version au premier
  // lancement, puis applique séquentiellement les migrations nécessaires quand le
  // format évolue (nouvelles tables, nouveaux champs…). Évite d'éparpiller des
  // correctifs de migration dans le reste du code.

  // Version du **format de stockage** (entier) : à incrémenter à chaque changement
  // de format, en ajoutant la migration updateToVx() correspondante. Sert à garantir
  // qu'un utilisateur d'une version antérieure récupère des données au bon format.
  // Indépendante de la version affichée ci-dessous.
  private readonly appVersion = 4;
  // Version **commerciale**, destinée à l'utilisateur (illustre l'ampleur des mises
  // à jour). Sans rapport avec appVersion. Reste « 1.0 » jusqu'à la finalisation de
  // l'app et les premiers tests utilisateur.
  readonly appVersionDisplay = "1.4.4";

  constructor(
    private storage: StorageService,
    private database: DatabaseService
  ) { }

  // À appeler une seule fois au démarrage de l'application, avant toute lecture
  // de la bdd (câblé via provideAppInitializer dans main.ts).
  async init(): Promise<void> {
    const userVersion: number = await this.storage.get("version");

    // Premier lancement (ou utilisateur antérieur au versionnage) : on pose la
    // version courante et on matérialise la db. database.get() renvoie les données
    // existantes si elles existent, sinon la structure par défaut → aucune perte.
    if (!userVersion) {
      await this.database.update(await this.database.get());
      await this.storage.set("version", this.appVersion);
      return;
    }

    // Déjà à jour : rien à faire.
    if (userVersion === this.appVersion) {
      return;
    }

    // Sinon, on applique les migrations dans l'ordre croissant, puis on enregistre
    // la nouvelle version.
    if (userVersion < 2) {
      await this.updateToV2();
    }
    if (userVersion < 3) {
      await this.updateToV3();
    }
    if (userVersion < 4) {
      await this.updateToV4();
    }
    await this.storage.set("version", this.appVersion);
  }

  // Migration v1 → v2 : ajout de la table personas.
  private async updateToV2(): Promise<void> {
    const db = await this.database.get();
    db.personas = db.personas || [];
    await this.database.update(db);
  }

  // Migration v2 → v3 : ajout de la table usage (suivi d'utilisation des modèles).
  private async updateToV3(): Promise<void> {
    const db = await this.database.get();
    db.usage = db.usage || [];
    await this.database.update(db);
  }

  // Migration v3 → v4 : fusionne les champs "likes" et "dislikes" de chaque personnage
  // en un unique champ "preferences". Les valeurs ne sont pas introduites par « aime »/
  // « n'aime pas » (elles listent directement les objets) → on préfixe nous-mêmes, puis
  // on retire les anciens champs.
  private async updateToV4(): Promise<void> {
    const db = await this.database.get();
    const characters = db.characters || [];
    for (const character of characters) {
      const likes = (character.likes || "").trim();
      const dislikes = (character.dislikes || "").trim();
      const parts: string[] = [];
      if (likes) {
        parts.push(`Aime ${likes}`);
      }
      if (dislikes) {
        parts.push(`N'aime pas ${dislikes}`);
      }
      // Simple retour à la ligne entre les deux parties (pas de « ; » : les valeurs se
      // terminent souvent déjà par un point, la double ponctuation est disgracieuse).
      const preferences = parts.join("\n");
      if (preferences) {
        character.preferences = preferences;
      }
      delete character.likes;
      delete character.dislikes;
    }
    await this.database.update(db);
  }
}
