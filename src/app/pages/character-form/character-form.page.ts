import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, ViewWillEnter } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';

import { CharacterService } from 'src/app/services/character-service';
import { MessageService } from 'src/app/services/message-service';

@Component({
  selector: 'app-character-form',
  templateUrl: './character-form.page.html',
  styleUrls: ['./character-form.page.scss'],
  standalone: true,
  imports: [IonContent, FormsModule]
})
export class CharacterFormPage implements ViewWillEnter {

  // Id du personnage en cours d'édition (vide en mode création).
  characterId = "";
  name = "";
  systemPrompt = "";
  // Message d'accueil du personnage (premier message de la conversation).
  greeting = "";

  async ionViewWillEnter() {
    await this.loadIfEditing();
  }

  constructor(
    private characterService: CharacterService,
    private message: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  // Mode édition : pré-remplit le formulaire si un id est présent dans l'URL.
  async loadIfEditing() {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      return;
    }
    const character = await this.characterService.get(id);
    if (!character) {
      return;
    }
    this.characterId = character.id;
    this.name = character.name;
    this.systemPrompt = character.systemPrompt;
    // ?? "" : les anciens personnages créés avant cette fonctionnalité n'ont pas de salutation.
    this.greeting = character.greeting ?? "";
  }

  isEditing(): boolean {
    return !!this.characterId;
  }

  async save() {
    const name = this.name.trim();
    if (!name) {
      await this.message.error("Donne un nom au personnage.");
      return;
    }
    const changes = { name: name, systemPrompt: this.systemPrompt.trim(), greeting: this.greeting.trim() };
    if (this.isEditing()) {
      await this.characterService.update(this.characterId, changes);
    } else {
      await this.characterService.create(changes.name, changes.systemPrompt, changes.greeting);
    }
    this.router.navigate(["characters"]);
  }

  cancel() {
    this.router.navigate(["characters"]);
  }
}
