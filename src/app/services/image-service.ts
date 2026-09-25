import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { environment } from 'src/environments/environment';

// Résultat d'une génération d'image : l'image (data URL), le modèle utilisé et le
// coût estimé en neurons Cloudflare.
export interface ImageResult {
  image: string;
  model: string;
  neurons: number;
}

// Longueur maximale du prompt acceptée par Cloudflare FLUX (2048 caractères).
// On garde une marge de sécurité sous la limite stricte.
const MAX_PROMPT_LENGTH = 2000;

// La résolution n'est plus paramétrable : l'API refuse désormais width/height (erreur
// 5006 « Additional properties not allowed »). Le modèle impose du 1024×1024, soit
// 4 tuiles de 512×512. Coût estimé en neurons Cloudflare pour flux-1-schnell :
// 9,60 neurons/step + 4,80 neurons/tuile 512×512.
const IMAGE_STEPS = 4;
const IMAGE_TILES = 4;
const NEURONS_PER_STEP = 9.6;
const NEURONS_PER_TILE = 4.8;
// 4 × 9,60 (steps) + 4 × 4,80 (tuiles) = 57,6 neurons par image (1024×1024).
const NEURONS_PER_IMAGE = IMAGE_STEPS * NEURONS_PER_STEP + IMAGE_TILES * NEURONS_PER_TILE;

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
      body: JSON.stringify({ prompt: safePrompt, steps: IMAGE_STEPS })
    });

    if (!response.ok) {
      // Cloudflare signale le dépassement du quota gratuit de neurons par le code
      // d'erreur 4006 (« daily free neuron limit exceeded »). On marque alors l'erreur
      // pour que l'appelant signale le modèle comme épuisé (cf. UsageService).
      let detail = "";
      let quotaExceeded = response.status === 429;
      try {
        const body: any = await response.json();
        const apiError = body?.errors?.[0];
        detail = apiError?.message || "";
        if (apiError?.code === 4006) {
          quotaExceeded = true;
        }
      } catch {
        detail = "";
      }
      const error: any = new Error(`HTTP ${response.status}${detail ? " — " + detail : ""}`);
      error.quotaExceeded = quotaExceeded;
      throw error;
    }

    // flux-1-schnell renvoie { result: { image: "<base64 jpeg>" }, success: true }.
    const data: any = await response.json();
    const base64 = data?.result?.image;
    return {
      image: base64 ? `data:image/jpeg;base64,${base64}` : "",
      model: model,
      neurons: NEURONS_PER_IMAGE
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
