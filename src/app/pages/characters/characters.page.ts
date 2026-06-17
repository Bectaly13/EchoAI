import { Component } from '@angular/core';
import { IonContent, ViewWillEnter, AlertController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

import { Character, CharacterService } from 'src/app/services/character-service';

import { CharacterCardComponent } from 'src/app/components/character-card/character-card.component';

@Component({
  selector: 'app-characters',
  templateUrl: './characters.page.html',
  styleUrls: ['./characters.page.scss'],
  standalone: true,
  imports: [IonContent, CharacterCardComponent]
})
export class CharactersPage implements ViewWillEnter {

  characters: Character[] = [];

  async ionViewWillEnter() {
    await this.loadCharacters();
  }

  constructor(
    private characterService: CharacterService,
    private router: Router,
    private alert: AlertController
  ) { }

  async loadCharacters() {
    this.characters = await this.characterService.list();
  }

  goToCreate() {
    this.router.navigate(["character-form"]);
  }

  goToEdit(character: Character) {
    this.router.navigate(["character-form", character.id]);
  }

  goToChat(character: Character) {
    this.router.navigate(["chat", character.id]);
  }

  // Demande confirmation avant de supprimer un personnage.
  async confirmRemove(character: Character) {
    const alert = await this.alert.create({
      header: "Supprimer ?",
      message: `Supprimer « ${character.name} » et sa conversation ?`,
      buttons: [
        { text: "Annuler", role: "cancel" },
        { text: "Supprimer", role: "destructive", handler: () => this.remove(character) }
      ]
    });
    await alert.present();
  }

  async remove(character: Character) {
    await this.characterService.remove(character.id);
    await this.loadCharacters();
  }
}
