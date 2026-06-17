import { Injectable } from '@angular/core';

import { StorageService } from './storage-service';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {

  // Structure par défaut de la db : une table par type de données.
  db: any = {
    characters: [],     // les personnages créés par l'utilisateur
    conversations: [],  // une conversation (liste de messages) par personnage
    personas: []        // les personas que l'utilisateur peut incarner
  };

  constructor(
    private storage: StorageService
  ) { }

  async get() {
    return await this.storage.get("db") || this.db;
  }

  async update(db: any) {
    await this.storage.set("db", db);
  }

  async updateTable(tableName: string, table: any) {
    let db = await this.get();
    db[tableName] = table;
    await this.update(db);
  }

  async getTable(tableName: string) {
    let db = await this.get();
    return db[tableName];
  }

  // ----- Opérations sur les lignes (entries) d'une table -----
  // Une table est un tableau de lignes. Toutes ces méthodes tolèrent une table
  // absente (traitée comme un tableau vide) pour éviter les erreurs au 1er usage.

  // Ajoute une ligne à une table (la crée si elle n'existe pas). Renvoie la ligne ajoutée.
  async addEntry(tableName: string, entry: any) {
    let db = await this.get();
    let table = db[tableName] || [];
    table.push(entry);
    db[tableName] = table;
    await this.update(db);
    return entry;
  }

  // Renvoie toutes les lignes dont entry[column] === value (tableau vide si aucune).
  async getEntriesWith(tableName: string, column: string, value: any) {
    let table = await this.getTable(tableName) || [];
    return table.filter((entry: any) => entry[column] === value);
  }

  // Renvoie la première ligne dont entry[column] === value, ou undefined.
  // Pratique pour une recherche par identifiant unique.
  async getEntryWith(tableName: string, column: string, value: any) {
    let table = await this.getTable(tableName) || [];
    return table.find((entry: any) => entry[column] === value);
  }

  // Supprime les lignes dont entry[column] === value. Renvoie le nombre supprimé.
  async removeEntriesWith(tableName: string, column: string, value: any) {
    let db = await this.get();
    let table = db[tableName] || [];
    let kept = table.filter((entry: any) => entry[column] !== value);
    db[tableName] = kept;
    await this.update(db);
    return table.length - kept.length;
  }

  // Fusionne `changes` dans les lignes dont entry[column] === value. Renvoie le nombre modifié.
  async updateEntriesWith(tableName: string, column: string, value: any, changes: any) {
    let db = await this.get();
    let table = db[tableName] || [];
    let updated = 0;
    for (let entry of table) {
      if (entry[column] === value) {
        Object.assign(entry, changes);
        updated++;
      }
    }
    db[tableName] = table;
    await this.update(db);
    return updated;
  }
}
