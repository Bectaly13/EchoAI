import { Injectable } from '@angular/core';

import { DatabaseService } from './database-service';
import { GeminiUsage } from './gemini-service';

import { environment } from 'src/environments/environment';

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
  // Neurons estimés consommés (image / Cloudflare uniquement ; 0 pour le texte).
  neurons: number;
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
  // épuisés rencontrés lors du repli. Accepte tout résultat portant le modèle,
  // l'usage et les modèles épuisés (génération de texte ou JSON structuré).
  async recordText(result: { model: string; usage?: GeminiUsage; exhausted: string[] }): Promise<void> {
    const date = this.todayFor("text");
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

  // Enregistre un appel image réussi : compte une requête et cumule les neurons
  // estimés (les modèles image ne renvoient pas de comptage de tokens).
  async recordImage(model: string, neurons: number): Promise<void> {
    const date = this.todayFor("image");
    const rows = await this.load();
    const row = this.upsert(rows, date, model, "image");
    row.requests += 1;
    row.neurons = (row.neurons ?? 0) + neurons;
    await this.save(rows);
  }

  // Marque le modèle d'image (Cloudflare) comme épuisé pour aujourd'hui (quota de
  // neurons gratuit dépassé, code 4006). Réinitialisé au changement de jour UTC.
  async markImageExhausted(): Promise<void> {
    const rows = await this.load();
    this.upsert(rows, this.todayFor("image"), environment.CLOUDFLARE_IMAGE_MODEL, "image").exhausted = true;
    await this.save(rows);
  }

  // Renvoie les lignes d'utilisation du jour. Le « jour » dépend du fuseau de
  // réinitialisation du quota : Pacifique pour le texte (Gemini), UTC pour l'image
  // (Cloudflare) → on compare chaque ligne à la date du jour correspondant à son type.
  async getToday(): Promise<UsageRow[]> {
    return (await this.load()).filter(row => row.date === this.todayFor(row.kind));
  }

  // Renvoie tout l'historique d'utilisation.
  async getAll(): Promise<UsageRow[]> {
    return await this.load();
  }

  // ----- Internes -----

  // Date du jour ("AAAA-MM-JJ") selon le type d'appel : le quota gratuit Gemini se
  // réinitialise ~minuit Pacifique (texte), celui de Cloudflare à 00:00 UTC (image).
  private todayFor(kind: UsageKind): string {
    return kind === "image" ? this.todayInZone("UTC") : this.todayInZone("America/Los_Angeles");
  }

  // Date du jour "AAAA-MM-JJ" dans un fuseau donné (en-CA produit directement ce
  // format ; le fuseau gère automatiquement l'heure d'été).
  private todayInZone(timeZone: string): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  }

  // Renvoie la ligne (date, modèle, type), en la créant à zéro si elle n'existe pas.
  private upsert(rows: UsageRow[], date: string, model: string, kind: UsageKind): UsageRow {
    let row = rows.find(item => item.date === date && item.model === model && item.kind === kind);
    if (!row) {
      row = { date: date, model: model, kind: kind, requests: 0, promptTokens: 0, candidatesTokens: 0, totalTokens: 0, neurons: 0, exhausted: false };
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
