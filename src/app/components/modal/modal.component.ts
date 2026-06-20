import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  standalone: true
})
export class ModalComponent {

  // Ouverture de la modale.
  open = input<boolean>(false);
  // Titre affiché en haut de la carte (optionnel).
  title = input<string>("");
  // Émis quand on ferme (clic sur le fond assombri).
  dismiss = output<void>();
}
