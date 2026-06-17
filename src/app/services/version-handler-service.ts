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

  // Version courante du format de la bdd. À incrémenter à chaque changement de
  // format, en ajoutant la migration updateToVx() correspondante ci-dessous.
  private readonly appVersion = 1;
  // Version lisible, destinée à l'affichage (écran « à propos », debug…).
  readonly appVersionDisplay = "1.0";

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
    // la nouvelle version. Exemple pour la future v2 (ex. : ajout de la table personas) :
    //   if (userVersion < 2) {
    //     await this.updateToV2();
    //   }
    await this.storage.set("version", this.appVersion);
  }

  // Modèle de migration à dupliquer pour chaque nouvelle version du format :
  // private async updateToV2(): Promise<void> {
  //   const db = await this.database.get();
  //   db.personas = db.personas || [];
  //   await this.database.update(db);
  // }
}
