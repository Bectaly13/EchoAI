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
  // Utilisation du jour, par modèle de texte puis par modèle d'image.
  textModels: ModelUsage[] = [];
  imageModels: ModelUsage[] = [];
  // Total de tokens consommés aujourd'hui (texte).
  totalTokens = 0;

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
    this.imageModels = environment.GEMINI_IMAGE_MODELS.map(model => this.viewFor(rows, model, "image"));
    this.totalTokens = rows.reduce((sum, row) => sum + row.totalTokens, 0);
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
