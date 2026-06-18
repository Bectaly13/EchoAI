import { Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack } from 'ionicons/icons';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [IonIcon]
})
export class HeaderComponent {

  // Titre affiché, transmis par la page parente.
  title = input.required<string>();
  // Affiche une flèche de retour à gauche du titre.
  showBack = input<boolean>(false);
  // Émis au clic sur la flèche de retour.
  back = output<void>();

  constructor() {
    // Enregistre l'icône utilisée par le header (requis en mode standalone).
    addIcons({ "arrow-back": arrowBack });
  }
}
