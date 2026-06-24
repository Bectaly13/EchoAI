import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

import { Character, CharacterService } from 'src/app/services/character-service';
import { PersonaGender, PersonaService } from 'src/app/services/persona-service';

import { CharacterCardComponent } from 'src/app/components/character-card/character-card.component';
import { ConfirmModalComponent } from 'src/app/components/confirm-modal/confirm-modal.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ModalComponent } from 'src/app/components/modal/modal.component';
import { NavbarComponent } from 'src/app/components/navbar/navbar.component';

@Component({
  selector: 'app-characters',
  templateUrl: './characters.page.html',
  styleUrls: ['./characters.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, FormsModule, CharacterCardComponent, ConfirmModalComponent, HeaderComponent, ModalComponent, NavbarComponent]
})
export class CharactersPage implements ViewWillEnter {

  characters: Character[] = [];
  // Modale de saisie du nom + genre (persona par défaut) au premier lancement.
  namePrompt = { open: false, personaId: "", value: "", gender: "male" as PersonaGender };
  // Options du sélecteur de genre.
  readonly genderOptions: { value: PersonaGender; label: string }[] = [
    { value: "male", label: "Homme" },
    { value: "female", label: "Femme" },
    { value: "other", label: "Autre" }
  ];
  // Modale de confirmation (réutilisée).
  confirmModal = { open: false, title: "", message: "", confirmLabel: "Confirmer", action: (() => {}) as () => void };

  async ionViewWillEnter() {
    await this.loadCharacters();
    await this.promptUserNameIfNeeded();
  }

  constructor(
    private characterService: CharacterService,
    private personaService: PersonaService,
    private router: Router
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
    this.namePrompt = { open: true, personaId: persona.id, value: persona.name, gender: persona.gender ?? "male" };
  }

  async saveUserName() {
    const trimmed = this.namePrompt.value.trim();
    if (trimmed) {
      await this.personaService.update(this.namePrompt.personaId, { name: trimmed, gender: this.namePrompt.gender });
    }
    this.namePrompt.open = false;
  }

  goToCreate() {
    this.router.navigate(["character-form"]);
  }

  goToEdit(character: Character) {
    this.router.navigate(["character-form", character.id]);
  }

  // Demande confirmation avant de supprimer un personnage.
  confirmRemove(character: Character) {
    this.askConfirm(
      "Supprimer ?",
      `Supprimer « ${character.name} » et sa conversation ?`,
      "Supprimer",
      () => this.remove(character)
    );
  }

  async remove(character: Character) {
    await this.characterService.remove(character.id);
    await this.loadCharacters();
  }

  // ----- Modale de confirmation -----
  private askConfirm(title: string, message: string, confirmLabel: string, action: () => void) {
    this.confirmModal = { open: true, title, message, confirmLabel, action };
  }

  runConfirm() {
    const action = this.confirmModal.action;
    this.confirmModal.open = false;
    action();
  }
}
