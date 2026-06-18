import { Component } from '@angular/core';
import { IonContent, IonHeader, ViewWillEnter, AlertController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

import { Character, CharacterService } from 'src/app/services/character-service';
import { PersonaService } from 'src/app/services/persona-service';

import { CharacterCardComponent } from 'src/app/components/character-card/character-card.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { NavbarComponent } from 'src/app/components/navbar/navbar.component';

@Component({
  selector: 'app-characters',
  templateUrl: './characters.page.html',
  styleUrls: ['./characters.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, CharacterCardComponent, HeaderComponent, NavbarComponent]
})
export class CharactersPage implements ViewWillEnter {

  characters: Character[] = [];

  async ionViewWillEnter() {
    await this.loadCharacters();
    await this.promptUserNameIfNeeded();
  }

  constructor(
    private characterService: CharacterService,
    private personaService: PersonaService,
    private router: Router,
    private alert: AlertController
  ) { }

  async loadCharacters() {
    this.characters = await this.characterService.list();
  }

  // Au premier lancement, invite l'utilisateur à nommer son persona par défaut.
  // Proposé une seule fois (le persona reste éditable ensuite via la page Personas).
  async promptUserNameIfNeeded() {
    if (await this.personaService.hasPromptedName()) {
      return;
    }
    // On mémorise tout de suite : on ne redemandera plus, même si l'invite est ignorée.
    await this.personaService.markNamePrompted();
    const persona = await this.personaService.getDefault();
    if (!persona) {
      return;
    }
    const alert = await this.alert.create({
      header: "Comment t'appelles-tu ?",
      message: "Ce nom est ton persona par défaut, transmis aux personnages. Tu pourras le modifier dans « Personas ».",
      inputs: [{ name: "name", type: "text", value: persona.name, placeholder: "Ton nom" }],
      buttons: [
        { text: "Plus tard", role: "cancel" },
        { text: "Valider", handler: (data: { name: string }) => this.saveUserName(persona.id, data.name) }
      ]
    });
    await alert.present();
  }

  private async saveUserName(personaId: string, name: string) {
    const trimmed = (name || "").trim();
    if (trimmed) {
      await this.personaService.update(personaId, { name: trimmed });
    }
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
