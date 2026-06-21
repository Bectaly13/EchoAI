import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { environment } from 'src/environments/environment';

// Résultat d'une génération d'image : l'image (data URL) et le modèle utilisé.
export interface ImageResult {
  image: string;
  model: string;
}

// Longueur maximale du prompt acceptée par Cloudflare FLUX (2048 caractères).
// On garde une marge de sécurité sous la limite stricte.
const MAX_PROMPT_LENGTH = 2000;

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  // Service bas niveau de génération d'image via Cloudflare Workers AI (FLUX).
  // Utilise fetch : sur appareil, CapacitorHttp fait passer la requête par le natif
  // (pas de CORS) ; en `ionic serve`, on passe par le proxy de dev (proxy.conf.json).

  // Indique si la génération d'image est configurée (account id + token présents).
  enabled(): boolean {
    return !!environment.CLOUDFLARE_ACCOUNT_ID && !!environment.CLOUDFLARE_API_TOKEN;
  }

  // Génère une image à partir d'un prompt (text-to-image) et la renvoie en data URL.
  async generate(prompt: string): Promise<ImageResult> {
    const safePrompt = this.truncatePrompt(prompt);
    const model = environment.CLOUDFLARE_IMAGE_MODEL;
    const path = `client/v4/accounts/${environment.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;
    // Natif : URL réelle (CapacitorHttp contourne le CORS). Navigateur : proxy de dev.
    const url = Capacitor.isNativePlatform() ? `https://api.cloudflare.com/${path}` : `/cf-ai/${path}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${environment.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt: safePrompt, steps: 4 })
    });

    if (!response.ok) {
      // 429 = quota de neurons épuisé pour la journée ; autre = erreur d'appel.
      let detail = "";
      try {
        const body: any = await response.json();
        detail = body?.errors?.[0]?.message || "";
      } catch {
        detail = "";
      }
      throw new Error(`HTTP ${response.status}${detail ? " — " + detail : ""}`);
    }

    // flux-1-schnell renvoie { result: { image: "<base64 jpeg>" }, success: true }.
    const data: any = await response.json();
    const base64 = data?.result?.image;
    return {
      image: base64 ? `data:image/jpeg;base64,${base64}` : "",
      model: model
    };
  }

  // Tronque le prompt à MAX_PROMPT_LENGTH (limite de l'API image). Coupe de
  // préférence sur le dernier espace pour ne pas finir en plein milieu d'un mot.
  private truncatePrompt(prompt: string): string {
    if (prompt.length <= MAX_PROMPT_LENGTH) {
      return prompt;
    }
    const cut = prompt.slice(0, MAX_PROMPT_LENGTH);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
  }
}
