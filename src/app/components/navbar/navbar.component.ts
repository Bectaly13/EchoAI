import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { people, chatbubbles, personCircle, server, settings } from 'ionicons/icons';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: true,
  imports: [IonIcon, RouterLink, RouterLinkActive]
})
export class NavbarComponent {

  constructor() {
    // Enregistre les icônes des onglets (requis en mode standalone).
    addIcons({ people, chatbubbles, "person-circle": personCircle, server, settings });
  }
}
