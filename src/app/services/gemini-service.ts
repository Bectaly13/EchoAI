import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
}
