import { Component, input, output } from '@angular/core';

import { Character } from 'src/app/services/character-service';

@Component({
  selector: 'app-character-card',
  templateUrl: './character-card.component.html',
  styleUrls: ['./character-card.component.scss'],
})
export class CharacterCardComponent {

  // Le personnage à afficher.
  character = input.required<Character>();

  // Ouvrir la conversation avec ce personnage.
  open = output<void>();
  // Éditer ce personnage.
  edit = output<void>();
  // Supprimer ce personnage.
  remove = output<void>();

  // Première lettre du nom, affichée dans l'avatar.
  initial(): string {
    return this.character().name.charAt(0).toUpperCase();
  }

  // Émet l'édition sans déclencher l'ouverture de la conversation.
  onEdit(event: Event) {
    event.stopPropagation();
    this.edit.emit();
  }

  // Émet la suppression sans déclencher l'ouverture de la conversation.
  onRemove(event: Event) {
    event.stopPropagation();
    this.remove.emit();
  }
}
