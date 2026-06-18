import { Injectable } from '@angular/core';

import { DatabaseService } from './database-service';
import { GeminiImageResult, GeminiTextResult } from './gemini-service';

// Type d'appel suivi : génération de texte ou d'image.
export type UsageKind = "text" | "image";

// Une ligne d'utilisation, agrégée par jour, par modèle et par type d'appel.
export interface UsageRow {
  date: string;              // jour local au format "AAAA-MM-JJ"
  model: string;
  kind: UsageKind;
  requests: number;          // nombre d'appels réussis
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  // Un 429 (quota épuisé) a été observé pour ce modèle ce jour-là.
  exhausted: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UsageService {
  // Suivi d'utilisation **estimé** des modèles : compteurs locaux de requêtes et de
  // tokens (lus dans usageMetadata), plus l'état « épuisé » déduit des 429.
  // ⚠️ L'API Gemini n'expose pas le quota restant : ces chiffres sont une estimation
  // locale, pas une lecture officielle du palier gratuit.

  constructor(
    private database: DatabaseService
  ) { }

  // Enregistre un appel texte réussi (requête + tokens) et marque les modèles
  // épuisés rencontrés lors du repli.
  async recordText(result: GeminiTextResult): Promise<void> {
    const date = this.today();
    const rows = await this.load();
    const row = this.upsert(rows, date, result.model, "text");
    row.requests += 1;
    if (result.usage) {
      row.promptTokens += result.usage.promptTokenCount;
      row.candidatesTokens += result.usage.candidatesTokenCount;
      row.totalTokens += result.usage.totalTokenCount;
    }
    this.markExhausted(rows, date, result.exhausted, "text");
    await this.save(rows);
  }

  // Enregistre un appel image réussi et marque les modèles épuisés rencontrés.
  // (Les modèles image ne renvoient pas de comptage de tokens.)
  async recordImage(result: GeminiImageResult): Promise<void> {
    const date = this.today();
    const rows = await this.load();
    const row = this.upsert(rows, date, result.model, "image");
    row.requests += 1;
    this.markExhausted(rows, date, result.exhausted, "image");
    await this.save(rows);
  }

  // Renvoie les lignes d'utilisation du jour.
  async getToday(): Promise<UsageRow[]> {
    const date = this.today();
    return (await this.load()).filter(row => row.date === date);
  }

  // Renvoie tout l'historique d'utilisation.
  async getAll(): Promise<UsageRow[]> {
    return await this.load();
  }

  // ----- Internes -----

  // Date locale du jour au format "AAAA-MM-JJ".
  private today(): string {
    const now = new Date();
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }

  // Renvoie la ligne (date, modèle, type), en la créant à zéro si elle n'existe pas.
  private upsert(rows: UsageRow[], date: string, model: string, kind: UsageKind): UsageRow {
    let row = rows.find(item => item.date === date && item.model === model && item.kind === kind);
    if (!row) {
      row = { date: date, model: model, kind: kind, requests: 0, promptTokens: 0, candidatesTokens: 0, totalTokens: 0, exhausted: false };
      rows.push(row);
    }
    return row;
  }

  // Marque comme épuisés (429) les modèles donnés pour ce jour.
  private markExhausted(rows: UsageRow[], date: string, models: string[], kind: UsageKind): void {
    for (const model of models) {
      this.upsert(rows, date, model, kind).exhausted = true;
    }
  }

  private async load(): Promise<UsageRow[]> {
    return (await this.database.getTable("usage")) || [];
  }

  private async save(rows: UsageRow[]): Promise<void> {
    await this.database.updateTable("usage", rows);
  }
}
