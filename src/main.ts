import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { IonicStorageModule } from '@ionic/storage-angular';

import { PersonaService } from './app/services/persona-service';
import { VersionHandlerService } from './app/services/version-handler-service';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    // Nécessaire pour les appels HTTP vers l'API Gemini.
    provideHttpClient(),
    // Stockage local des personnages et conversations (utilisé par StorageService).
    importProvidersFrom(IonicStorageModule.forRoot()),
    // Applique les migrations de format de la bdd, puis garantit le persona par
    // défaut, avant le démarrage de l'app. Les services sont injectés de façon
    // synchrone (avant tout await) : inject() doit être appelé dans le contexte
    // d'injection, donc pas après une promesse.
    provideAppInitializer(() => {
      const versionHandler = inject(VersionHandlerService);
      const personaService = inject(PersonaService);
      return versionHandler.init().then(() => personaService.ensureDefault());
    }),
  ],
});
