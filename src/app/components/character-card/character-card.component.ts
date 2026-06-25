import { Component, input, output } from '@angular/core';

import { Character } from 'src/app/services/character-service';

import { interpolateTags } from 'src/app/utils/interpolate-tags';

@Component({
  selector: 'app-character-card',
  templateUrl: './character-card.component.html',
  styleUrls: ['./character-card.component.scss'],
})
export class CharacterCardComponent {

  // Le personnage à afficher.
  character = input.required<Character>();
  // Nom de l'utilisateur (persona par défaut) pour interpoler {user} dans l'aperçu.
  userName = input<string>("");

  // Clic sur la carte (ouvre l'édition du personnage côté page).
  open = output<void>();
  // Supprimer ce personnage.
  remove = output<void>();

  // Première lettre du nom, affichée dans l'avatar.
  initial(): string {
    return this.character().name.charAt(0).toUpperCase();
  }

  // Aperçu de la personnalité, balises {char}/{user} interpolées avec les vrais noms.
  preview(): string {
    return interpolateTags(this.character().systemPrompt, this.character().name, this.userName() || "l'utilisateur");
  }

  // Émet la suppression sans déclencher le clic sur la carte.
  onRemove(event: Event) {
    event.stopPropagation();
    this.remove.emit();
  }
}
