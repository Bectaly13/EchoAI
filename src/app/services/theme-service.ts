import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

import { StorageService } from './storage-service';

// Thèmes disponibles. « Défaut » = palette signature (façon Discord, bleu + sombre).
export type Theme = "Défaut" | "Clair" | "Sombre";

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  // Thème appliqué tant que l'utilisateur n'en a pas choisi un.
  private defaultTheme: Theme = "Défaut";

  // Correspondance thème → classe CSS appliquée sur <body> (voir src/theme/variables.scss).
  private themeClasses: Record<Theme, string> = {
    "Défaut": "theme-default",
    "Clair": "theme-light",
    "Sombre": "theme-dark"
  };

  // Style des icônes de la barre d'état Android par thème. Nommage Capacitor
  // contre-intuitif : Style.Dark = icônes CLAIRES (sur fond sombre), Style.Light
  // = icônes SOMBRES (sur fond clair).
  private statusBarStyles: Record<Theme, Style> = {
    "Défaut": Style.Dark,
    "Clair": Style.Light,
    "Sombre": Style.Dark
  };

  constructor(
    private storage: StorageService
  ) { }

  // Applique le thème mémorisé (ou le thème par défaut). À appeler au démarrage.
  async initTheme(): Promise<void> {
    await this.applyTheme(await this.getTheme());
  }

  // Applique un thème (classe sur <body>) et le mémorise.
  async applyTheme(theme: Theme): Promise<void> {
    await this.storage.set("theme", theme);
    document.body.classList.remove(...Object.values(this.themeClasses));
    document.body.classList.add(this.themeClasses[theme]);
    await this.applyStatusBar(theme, "--header-background");
  }

  // Accorde la barre d'état (Android) au **fond de page** (`--app-background`), pour
  // un écran sans header (ex. welcome) où la couleur header trancherait avec le fond.
  async useBackgroundStatusBar(): Promise<void> {
    await this.applyStatusBar(await this.getTheme(), "--app-background");
  }

  // Rétablit la barre d'état accordée au **header** (comportement normal des pages).
  async useHeaderStatusBar(): Promise<void> {
    await this.applyStatusBar(await this.getTheme(), "--header-background");
  }

  // Accorde la barre d'état (Android) au thème : style des icônes + couleur de fond
  // lue dans la variable CSS donnée. Sans effet hors plateforme native (web/tests) ;
  // toute erreur de l'API est ignorée pour ne jamais bloquer l'application du thème.
  private async applyStatusBar(theme: Theme, backgroundVar: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    try {
      await StatusBar.setStyle({ style: this.statusBarStyles[theme] });
      // setBackgroundColor n'existe que sur Android : on lit la couleur dans la
      // variable CSS du thème courant (pas de couleur en dur → suit variables.scss).
      if (Capacitor.getPlatform() === "android") {
        const color = getComputedStyle(document.body).getPropertyValue(backgroundVar).trim();
        if (color) {
          await StatusBar.setBackgroundColor({ color: color });
        }
      }
    } catch {
      // Barre d'état non disponible : on ignore.
    }
  }

  // Renvoie le thème mémorisé, ou le thème par défaut.
  async getTheme(): Promise<Theme> {
    return (await this.storage.get("theme")) || this.defaultTheme;
  }

  // Liste des thèmes disponibles (pour le sélecteur de la page Paramètres).
  getThemes(): Theme[] {
    return Object.keys(this.themeClasses) as Theme[];
  }
}
