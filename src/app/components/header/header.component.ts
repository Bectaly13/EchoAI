import { Component, input } from '@angular/core';
import { Router } from '@angular/router';
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
  // Destination du retour (commandes de route Angular), codée en dur par la page.
  // On navigue explicitement vers cette cible plutôt que via Location.back(), pour
  // éviter les boucles quand on alterne avec le bouton retour natif du téléphone.
  backTo = input<any[]>([]);

  constructor(private router: Router) {
    // Enregistre l'icône utilisée par le header (requis en mode standalone).
    addIcons({ "arrow-back": arrowBack });
  }

  // Navigue vers la destination de retour configurée.
  goBack() {
    const target = this.backTo();
    if (target.length > 0) {
      this.router.navigate(target);
    }
  }
}
