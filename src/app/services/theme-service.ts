import { Injectable } from '@angular/core';

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
