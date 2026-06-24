import { Component } from '@angular/core';
import { IonContent, ViewWillEnter } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

import { PersonaService } from 'src/app/services/persona-service';
import { ThemeService } from 'src/app/services/theme-service';
import { VersionHandlerService } from 'src/app/services/version-handler-service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
  standalone: true,
  imports: [IonContent]
})
export class WelcomePage implements ViewWillEnter {

  async ionViewWillEnter() {
    await this.initialize();
  }

  constructor(
    private personaService: PersonaService,
    private theme: ThemeService,
    private version: VersionHandlerService,
    private router: Router
  ) { }

  // Applique le thème, joue les migrations de bdd, garantit le persona par
  // défaut, puis redirige vers la liste des personnages après un court splash.
  async initialize() {
    await this.theme.initTheme();
    // Écran sans header : on accorde la barre d'état au fond de la page welcome.
    await this.theme.useBackgroundStatusBar();
    await this.version.init();
    await this.personaService.ensureDefault();
    await this.delay(1500);
    // On rétablit la barre d'état « header » avant de rejoindre les pages à header.
    await this.theme.useHeaderStatusBar();
    this.goToCharacters();
  }

  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  goToCharacters() {
    this.router.navigate(["characters"]);
  }
}
