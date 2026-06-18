import { Component } from '@angular/core';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';

import { Theme, ThemeService } from 'src/app/services/theme-service';
import { VersionHandlerService } from 'src/app/services/version-handler-service';

import { HeaderComponent } from 'src/app/components/header/header.component';
import { NavbarComponent } from 'src/app/components/navbar/navbar.component';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, HeaderComponent, NavbarComponent]
})
export class SettingsPage implements ViewWillEnter {

  themes: Theme[] = [];
  currentTheme: Theme = "Défaut";

  async ionViewWillEnter() {
    await this.loadSettings();
  }

  constructor(
    private theme: ThemeService,
    private version: VersionHandlerService
  ) { }

  async loadSettings() {
    this.themes = this.theme.getThemes();
    this.currentTheme = await this.theme.getTheme();
  }

  // Applique et mémorise le thème choisi.
  async selectTheme(theme: Theme) {
    this.currentTheme = theme;
    await this.theme.applyTheme(theme);
  }

  // Version (lisible) du format de données, affichée dans « À propos ».
  get appVersion(): string {
    return this.version.appVersionDisplay;
  }
}
