import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from 'src/environments/environment';

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

  // Appel HTTP au modèle. Renvoie le texte de la réponse.
  // systemPrompt : la personnalité du personnage. contents : l'historique formaté.
  async generate(systemPrompt: string, contents: any[]): Promise<string> {
    const url = `${environment.GEMINI_API_URL}/${environment.GEMINI_MODEL}:generateContent`;
    const body = {
      // La personnalité du personnage est passée comme instruction système.
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: contents
    };
    const response: any = await firstValueFrom(
      this.http.post(url, body, {
        headers: { "x-goog-api-key": environment.GEMINI_API_KEY }
      })
    );
    // Chemin standard de la réponse Gemini : candidates[0].content.parts[0].text
    return response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  // Appel HTTP attendant une réponse JSON structurée conforme à responseSchema.
  // Renvoie l'objet déjà désérialisé (ou null si la réponse est inexploitable).
  async generateStructured(prompt: string, responseSchema: any): Promise<any> {
    const url = `${environment.GEMINI_API_URL}/${environment.GEMINI_MODEL}:generateContent`;
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      // Force le modèle à répondre par du JSON respectant le schéma fourni.
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    };
    const response: any = await firstValueFrom(
      this.http.post(url, body, {
        headers: { "x-goog-api-key": environment.GEMINI_API_KEY }
      })
    );
    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  // Génère une image (text-to-image) et la renvoie en data URL base64.
  // Essaie chaque modèle de GEMINI_IMAGE_MODELS dans l'ordre et bascule sur le
  // suivant quand le quota du modèle courant est épuisé (429). Lève si tous
  // les modèles échouent ou en cas d'erreur non liée au quota.
  async generateImage(prompt: string): Promise<string> {
    let lastError: unknown;
    for (const model of environment.GEMINI_IMAGE_MODELS) {
      try {
        return await this.requestImage(model, prompt);
      } catch (error) {
        lastError = error;
        // 429 = quota épuisé pour ce modèle → on tente le suivant.
        // Toute autre erreur n'est pas un problème de quota → on remonte.
        if (!(error instanceof HttpErrorResponse) || error.status !== 429) {
          throw error;
        }
      }
    }
    throw lastError;
  }

  // Appel HTTP brut à un modèle image (endpoint :predict d'Imagen).
  private async requestImage(model: string, prompt: string): Promise<string> {
    const url = `${environment.GEMINI_API_URL}/${model}:predict`;
    const body = {
      instances: [{ prompt: prompt }],
      // Une seule image, format carré adapté à un avatar.
      parameters: { sampleCount: 1, aspectRatio: "1:1" }
    };
    const response: any = await firstValueFrom(
      this.http.post(url, body, {
        headers: { "x-goog-api-key": environment.GEMINI_API_KEY }
      })
    );
    const prediction = response?.predictions?.[0];
    const base64 = prediction?.bytesBase64Encoded;
    if (!base64) {
      return "";
    }
    const mime = prediction?.mimeType ?? "image/png";
    return `data:${mime};base64,${base64}`;
  }
}
