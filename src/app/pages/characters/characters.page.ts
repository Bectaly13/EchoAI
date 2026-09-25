import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

import { Character, CharacterService } from 'src/app/services/character-service';
import { ChatService } from 'src/app/services/chat-service';
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
  // Faux tant que le premier chargement n'est pas terminé : évite d'afficher « Aucun
  // personnage » alors que la liste est encore en cours de résolution. Reste vrai
  // ensuite (pas de « Chargement… » qui clignote à chaque retour sur la page).
  loaded = false;
  // Nom de l'utilisateur par personnage (clé = id du personnage), pour interpoler {user}
  // dans les aperçus : persona de la conversation existante, sinon persona par défaut.
  userNames: Record<string, string> = {};
  // Modale de saisie du persona par défaut au premier lancement (nom + genre +
  // âge + description + apparence ; tous facultatifs sauf le nom).
  namePrompt = { open: false, personaId: "", value: "", gender: "male" as PersonaGender, age: "", description: "", appearance: "" };
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
    private chatService: ChatService,
    private personaService: PersonaService,
    private router: Router
  ) { }

  async loadCharacters() {
    const characters = await this.characterService.list();
    // On résout les noms AVANT d'exposer la liste : au premier rendu, userNames est déjà
    // prêt → pas de flash du fallback le temps que la résolution asynchrone se termine.
    this.userNames = await this.resolveUserNames(characters);
    this.characters = characters;
    this.loaded = true;
  }

  // Résout, pour chaque personnage, le nom de l'utilisateur à afficher dans l'aperçu :
  // le persona de sa conversation s'il en existe une, sinon le persona par défaut
  // (getActivePersonaId assure déjà ce repli).
  private async resolveUserNames(characters: Character[]): Promise<Record<string, string>> {
    // Chargements groupés (indépendants du nombre de personnages) : personas actifs par
    // conversation, tous les personas indexés par id, et le persona par défaut (repli).
    const activePersonaIds = await this.chatService.getActivePersonaIdsByCharacter();
    const personas = await this.personaService.list();
    const defaultPersona = await this.personaService.getDefault();
    const personaById = new Map(personas.map(persona => [persona.id, persona]));
    const names: Record<string, string> = {};
    for (const character of characters) {
      const personaId = activePersonaIds[character.id];
      const persona = (personaId ? personaById.get(personaId) : undefined) ?? defaultPersona;
      names[character.id] = persona?.name ?? "";
    }
    return names;
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
    this.namePrompt = {
      open: true,
      personaId: persona.id,
      value: persona.name,
      gender: persona.gender ?? "male",
      age: persona.age ?? "",
      description: persona.description ?? "",
      appearance: persona.appearance ?? ""
    };
  }

  async saveUserName() {
    const trimmed = this.namePrompt.value.trim();
    if (trimmed) {
      await this.personaService.update(this.namePrompt.personaId, {
        name: trimmed,
        gender: this.namePrompt.gender,
        age: this.namePrompt.age.trim(),
        description: this.namePrompt.description.trim(),
        appearance: this.namePrompt.appearance.trim()
      });
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
