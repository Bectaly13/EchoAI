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
    return await this.withFallback(environment.GEMINI_MODELS, exhausted, async model => {
      const body = {
        // La personnalité du personnage est passée comme instruction système.
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: contents,
        safetySettings: SAFETY_SETTINGS,
        // Budget de « réflexion » propre au modèle (0 = thinking désactivé). Un thinking
        // implicite provoquait de fréquents 503 sur les modèles 3.x et alourdissait les réponses.
        generationConfig: { thinkingConfig: { thinkingBudget: model.thinkingBudget } }
      };
      const response = await this.post(`${model.id}:generateContent`, body);
      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      // Trace les métadonnées quand le texte est vide (blocage finishReason/safety, part
      // secondaire…) : aide au diagnostic des re-tirages déclenchés en amont par ChatService.
      if (!text.trim()) {
        this.logEmptyResponse(model.id, response);
      }
      return {
        text: text,
        model: model.id,
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
    return await this.withFallback(environment.GEMINI_MODELS, exhausted, async model => {
      const body = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        // Force le modèle à répondre par du JSON respectant le schéma fourni.
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          // Budget de réflexion propre au modèle (cf. generate).
          thinkingConfig: { thinkingBudget: model.thinkingBudget }
        },
        safetySettings: SAFETY_SETTINGS
      };
      const response = await this.post(`${model.id}:generateContent`, body);
      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
      return {
        data: data,
        model: model.id,
        usage: this.parseUsage(response?.usageMetadata),
        exhausted: [...exhausted]
      };
    });
  }

  // ----- Internes -----

  // Journalise les métadonnées d'une réponse texte vide (aucun contenu de message,
  // seulement de quoi identifier la cause : finishReason, blocage, parts…). Observable
  // via chrome://inspect (DevTools WebView) ou logcat sur l'appareil.
  private logEmptyResponse(model: string, response: any): void {
    const candidate = response?.candidates?.[0];
    const parts: any[] = candidate?.content?.parts ?? [];
    console.warn("[Gemini] réponse vide", {
      model: model,
      finishReason: candidate?.finishReason,
      blockReason: response?.promptFeedback?.blockReason,
      candidateCount: response?.candidates?.length ?? 0,
      partCount: parts.length,
      // Vrai si une part (autre que la première, lue par generate) contient du texte → cause A.
      partsHaveText: parts.some(part => typeof part?.text === "string" && part.text.trim().length > 0),
      candidateSafetyRatings: candidate?.safetyRatings,
      promptSafetyRatings: response?.promptFeedback?.safetyRatings,
      usage: this.parseUsage(response?.usageMetadata)
    });
  }

  // Boucle de repli : essaie chaque modèle dans l'ordre via `call`. On passe au modèle
  // suivant quand l'échec est propre au modèle courant : quota épuisé (429), surcharge
  // temporaire (503) ou modèle retiré (404). Seul le 429 marque le modèle « épuisé »
  // (suivi UsageService) ; 503/404 sont transitoires/structurels, pas des dépassements
  // de quota. Toute autre erreur (config : 400/401/403…) est remontée immédiatement, car
  // tenter les autres modèles n'y changerait rien. Lève la dernière erreur si tous échouent.
  private async withFallback<T>(models: { id: string; thinkingBudget: number }[], exhausted: string[], call: (model: { id: string; thinkingBudget: number }) => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (const model of models) {
      try {
        return await call(model);
      } catch (error) {
        lastError = error;
        if (error instanceof HttpErrorResponse && error.status === 429) {
          exhausted.push(model.id);
          continue;
        }
        if (error instanceof HttpErrorResponse && (error.status === 503 || error.status === 404)) {
          continue;
        }
        // Erreur non récupérable par un autre modèle → inutile de poursuivre.
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
