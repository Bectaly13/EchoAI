import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ScreenOrientation } from '@capacitor/screen-orientation';

// Bloque l'application en mode portrait (cible mobile). Le .catch évite une erreur
// dans un navigateur desktop, où l'API d'orientation n'est pas disponible.
ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => { /* non supporté ici */ });

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {}
}
