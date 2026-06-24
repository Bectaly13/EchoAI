import { Component } from '@angular/core';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';

import { UsageRow, UsageService } from 'src/app/services/usage-service';

import { HeaderComponent } from 'src/app/components/header/header.component';
import { NavbarComponent } from 'src/app/components/navbar/navbar.component';

import { environment } from 'src/environments/environment';

// Utilisation d'un modèle sur la journée (vue dérivée pour l'affichage).
interface ModelUsage {
  model: string;
  // Limite de requêtes/jour configurée (palier gratuit), affichée comme « X / rpd ».
  rpd: number;
  requests: number;
  totalTokens: number;
  exhausted: boolean;
}

@Component({
  selector: 'app-tokens',
  templateUrl: './tokens.page.html',
  styleUrls: ['./tokens.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, HeaderComponent, NavbarComponent]
})
export class TokensPage implements ViewWillEnter {

  // Vrai si une clé API est configurée (sinon, aucun appel réel n'est suivi).
  hasApiKey = false;
  // Utilisation du jour, par modèle de texte (Gemini).
  textModels: ModelUsage[] = [];
  // Génération d'image (Cloudflare) : disponible, modèle, requêtes du jour, épuisement.
  // (Les neurons sont estimés et stockés côté UsageService, mais pas affichés.)
  imageEnabled = false;
  imageModel = "";
  imageRequests = 0;
  imageExhausted = false;
  // Heure de réinitialisation du quota, convertie dans le fuseau local de l'appareil.
  textResetLabel = "";
  imageResetLabel = "";

  async ionViewWillEnter() {
    await this.load();
  }

  constructor(
    private usageService: UsageService
  ) { }

  // Charge l'utilisation du jour et la projette sur les chaînes de modèles configurées.
  async load() {
    this.hasApiKey = !!environment.GEMINI_API_KEY;
    const rows = await this.usageService.getToday();
    this.textModels = environment.GEMINI_MODELS.map(model => this.viewFor(rows, model, "text"));
    // Image (Cloudflare) : suivi par nombre de requêtes (quota en neurons, pas en requêtes).
    this.imageEnabled = !!environment.CLOUDFLARE_ACCOUNT_ID && !!environment.CLOUDFLARE_API_TOKEN;
    this.imageModel = environment.CLOUDFLARE_IMAGE_MODEL;
    const imageRow = rows.find(row => row.model === this.imageModel && row.kind === "image");
    this.imageRequests = imageRow?.requests ?? 0;
    this.imageExhausted = imageRow?.exhausted ?? false;
    // Texte (Gemini) : reset à minuit Pacifique ; image (Cloudflare) : 00:00 UTC.
    this.textResetLabel = this.localResetTime("America/Los_Angeles");
    this.imageResetLabel = this.localResetTime("UTC");
  }

  // Heure locale (HH:MM) correspondant à 00:00 dans le fuseau de réinitialisation
  // donné, en tenant compte du décalage (DST) courant.
  private localResetTime(timeZone: string): string {
    const now = new Date();
    const localOffset = -now.getTimezoneOffset();
    let minutes = (localOffset - this.zoneOffsetMinutes(timeZone, now)) % 1440;
    if (minutes < 0) {
      minutes += 1440;
    }
    return `${this.pad(Math.floor(minutes / 60))}:${this.pad(minutes % 60)}`;
  }

  // Décalage (minutes) du fuseau donné par rapport à UTC, à l'instant fourni.
  private zoneOffsetMinutes(timeZone: string, date: Date): number {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).formatToParts(date);
    const map: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        map[part.type] = parseInt(part.value, 10);
      }
    }
    const asUtc = Date.UTC(map["year"], map["month"] - 1, map["day"], map["hour"] % 24, map["minute"], map["second"]);
    return Math.round((asUtc - date.getTime()) / 60000);
  }

  private pad(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
  }

  // Accorde « requête » en nombre (0 et 1 → singulier, ≥ 2 → pluriel).
  requestLabel(count: number): string {
    return count >= 2 ? "requêtes" : "requête";
  }

  // Construit la vue d'un modèle (compteurs à zéro si aucune ligne pour aujourd'hui).
  private viewFor(rows: UsageRow[], model: { id: string; rpd: number }, kind: "text" | "image"): ModelUsage {
    const row = rows.find(item => item.model === model.id && item.kind === kind);
    return {
      model: model.id,
      rpd: model.rpd,
      requests: row?.requests ?? 0,
      totalTokens: row?.totalTokens ?? 0,
      exhausted: row?.exhausted ?? false
    };
  }
}
