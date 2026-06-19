import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from 'src/environments/environment';

// Désactive le filtrage de contenu configurable de Gemini sur toutes les catégories
// (app de fiction/roleplay). Les limites non configurables de l'API (ex. contenus
// illégaux) restent appliquées côté Google quoi qu'il arrive.
const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
];

// Comptage de tokens renvoyé par l'API (usageMetadata) pour un appel.
export interface GeminiUsage {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

// Résultat d'une génération de texte : le texte, le modèle qui a effectivement
// répondu, l'usage de tokens et la liste des modèles épuisés (429) avant le succès.
export interface GeminiTextResult {
  text: string;
  model: string;
  usage?: GeminiUsage;
  exhausted: string[];
}

// Résultat d'une génération JSON structurée : l'objet désérialisé (ou null), le
// modèle utilisé, l'usage de tokens et les modèles épuisés (429) avant le succès.
export interface GeminiStructuredResult {
  data: any;
  model: string;
  usage?: GeminiUsage;
  exhausted: string[];
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  // Service bas niveau : ne fait que l'appel HTTP brut au modèle Gemini.
  // Changer de modèle/fournisseur ne doit toucher que ce service + l'environment.

  constructor(
    private http: HttpClient
  ) { }

  // Indique si une clé API est configurée. Sans clé, l'app retombe sur un mock.
  hasApiKey(): boolean {
    return !!environment.GEMINI_API_KEY;
  }

  // Génère du texte. Essaie chaque modèle de GEMINI_MODELS dans l'ordre et bascule
  // sur le suivant quand le quota du modèle courant est épuisé (429). Renvoie le
  // texte, le modèle utilisé, l'usage de tokens et les modèles épuisés rencontrés.
  // Lève si tous les modèles échouent ou en cas d'erreur non liée au quota.
  async generate(systemPrompt: string, contents: any[]): Promise<GeminiTextResult> {
    const exhausted: string[] = [];
    return await this.withFallback(environment.GEMINI_MODELS.map(model => model.id), exhausted, async model => {
      const body = {
        // La personnalité du personnage est passée comme instruction système.
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: contents,
        safetySettings: SAFETY_SETTINGS
      };
      const response = await this.post(`${model}:generateContent`, body);
      return {
        text: response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
        model: model,
        usage: this.parseUsage(response?.usageMetadata),
        exhausted: [...exhausted]
      };
    });
  }

  // Appel HTTP attendant une réponse JSON structurée conforme à responseSchema.
  // Même chaîne de repli que generate(). Renvoie l'objet désérialisé (ou null),
  // le modèle utilisé et l'usage, pour que l'appelant comptabilise la requête.
  async generateStructured(prompt: string, responseSchema: any): Promise<GeminiStructuredResult> {
    const exhausted: string[] = [];
    return await this.withFallback(environment.GEMINI_MODELS.map(model => model.id), exhausted, async model => {
      const body = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        // Force le modèle à répondre par du JSON respectant le schéma fourni.
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        },
        safetySettings: SAFETY_SETTINGS
      };
      const response = await this.post(`${model}:generateContent`, body);
      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
      return {
        data: data,
        model: model,
        usage: this.parseUsage(response?.usageMetadata),
        exhausted: [...exhausted]
      };
    });
  }

  // ----- Internes -----

  // Boucle de repli : essaie chaque modèle dans l'ordre via `call`. Sur 429, ajoute
  // le modèle à `exhausted` et tente le suivant ; toute autre erreur est remontée.
  // Lève la dernière erreur si tous les modèles sont épuisés.
  private async withFallback<T>(models: string[], exhausted: string[], call: (model: string) => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (const model of models) {
      try {
        return await call(model);
      } catch (error) {
        lastError = error;
        if (error instanceof HttpErrorResponse && error.status === 429) {
          exhausted.push(model);
          continue;
        }
        // Erreur non liée au quota → inutile de tenter les autres modèles.
        throw error;
      }
    }
    throw lastError;
  }

  // POST brut vers une méthode de l'API (ex. "gemini-3.1-flash-lite:generateContent").
  private async post(path: string, body: any): Promise<any> {
    return await firstValueFrom(
      this.http.post(`${environment.GEMINI_API_URL}/${path}`, body, {
        headers: { "x-goog-api-key": environment.GEMINI_API_KEY }
      })
    );
  }

  // Normalise le bloc usageMetadata de la réponse (champs absents → 0).
  private parseUsage(usageMetadata: any): GeminiUsage | undefined {
    if (!usageMetadata) {
      return undefined;
    }
    return {
      promptTokenCount: usageMetadata.promptTokenCount ?? 0,
      candidatesTokenCount: usageMetadata.candidatesTokenCount ?? 0,
      totalTokenCount: usageMetadata.totalTokenCount ?? 0
    };
  }
}
