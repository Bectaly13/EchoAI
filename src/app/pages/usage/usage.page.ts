import { Component } from '@angular/core';
import { IonContent, ViewWillEnter } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

import { UsageRow, UsageService } from 'src/app/services/usage-service';
import { VersionHandlerService } from 'src/app/services/version-handler-service';

import { environment } from 'src/environments/environment';

// Utilisation d'un modèle sur la journée (vue dérivée pour l'affichage).
interface ModelUsage {
  model: string;
  requests: number;
  totalTokens: number;
  exhausted: boolean;
}

@Component({
  selector: 'app-usage',
  templateUrl: './usage.page.html',
  styleUrls: ['./usage.page.scss'],
  standalone: true,
  imports: [IonContent]
})
export class UsagePage implements ViewWillEnter {

  // Version du format de la bdd (affichée à titre informatif).
  appVersion = "";
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
    private router: Router,
    private usageService: UsageService,
    private versionHandler: VersionHandlerService
  ) { }

  // Charge l'utilisation du jour et la projette sur les chaînes de modèles configurées.
  async load() {
    this.appVersion = this.versionHandler.appVersionDisplay;
    this.hasApiKey = !!environment.GEMINI_API_KEY;
    const rows = await this.usageService.getToday();
    this.textModels = environment.GEMINI_MODELS.map(model => this.viewFor(rows, model, "text"));
    this.imageModels = environment.GEMINI_IMAGE_MODELS.map(model => this.viewFor(rows, model, "image"));
    this.totalTokens = rows.reduce((sum, row) => sum + row.totalTokens, 0);
  }

  // Construit la vue d'un modèle (compteurs à zéro si aucune ligne pour aujourd'hui).
  private viewFor(rows: UsageRow[], model: string, kind: "text" | "image"): ModelUsage {
    const row = rows.find(item => item.model === model && item.kind === kind);
    return {
      model: model,
      requests: row?.requests ?? 0,
      totalTokens: row?.totalTokens ?? 0,
      exhausted: row?.exhausted ?? false
    };
  }

  goBack() {
    this.router.navigate(["characters"]);
  }
}
