import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { IonicStorageModule } from '@ionic/storage-angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// L'initialisation (thème, migrations de bdd, persona par défaut) est désormais
// faite par la page Welcome, affichée au lancement avant la redirection.
bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    // Nécessaire pour les appels HTTP vers l'API Gemini.
    provideHttpClient(),
    // Stockage local des données utilisateur (utilisé par StorageService).
    importProvidersFrom(IonicStorageModule.forRoot()),
  ],
});
