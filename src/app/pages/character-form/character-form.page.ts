import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';

import { CharacterService } from 'src/app/services/character-service';
import { MessageService } from 'src/app/services/message-service';

import { HeaderComponent } from 'src/app/components/header/header.component';

import { describeApiError } from 'src/app/utils/describe-api-error';

@Component({
  selector: 'app-character-form',
  templateUrl: './character-form.page.html',
  styleUrls: ['./character-form.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, FormsModule, HeaderComponent]
})
export class CharacterFormPage implements ViewWillEnter {

  // Id du personnage en cours d'édition (vide en mode création).
  characterId = "";
  // Brouillon libre pour la génération assistée par IA, et état d'attente associé.
  brief = "";
  generating = false;
  name = "";
  systemPrompt = "";
  // Message d'accueil du personnage (premier message de la conversation).
  greeting = "";
  // Champs structurés optionnels.
  appearance = "";
  initialRelationship = "";
  likes = "";
  dislikes = "";
  knownCharacters = "";
  // Photo de profil générée (data URL base64) et état d'attente associé.
  avatarImage = "";
  generatingImage = false;
  // Génération d'image disponible (false sur le palier gratuit).
  imageEnabled = false;

  async ionViewWillEnter() {
    await this.loadIfEditing();
  }

  constructor(
    private characterService: CharacterService,
    private location: Location,
    private message: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  // Mode édition : pré-remplit le formulaire si un id est présent dans l'URL.
  async loadIfEditing() {
    this.imageEnabled = this.characterService.canGenerateImage();
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      return;
    }
    const character = await this.characterService.get(id);
    if (!character) {
      return;
    }
    // ?? "" : les anciens personnages n'ont pas forcément ces champs (ajoutés au fil des versions).
    this.characterId = character.id;
    this.name = character.name;
    this.systemPrompt = character.systemPrompt;
    this.greeting = character.greeting ?? "";
    this.appearance = character.appearance ?? "";
    this.initialRelationship = character.initialRelationship ?? "";
    this.likes = character.likes ?? "";
    this.dislikes = character.dislikes ?? "";
    this.knownCharacters = character.knownCharacters ?? "";
    this.avatarImage = character.avatarImage ?? "";
  }

  isEditing(): boolean {
    return !!this.characterId;
  }

  // Génère une fiche à partir du brouillon et pré-remplit les champs (éditables).
  async generateDraft() {
    const brief = this.brief.trim();
    if (!brief || this.generating) {
      return;
    }
    this.generating = true;
    try {
      const draft = await this.characterService.draftFromBrief(brief);
      this.name = draft.name;
      this.systemPrompt = draft.systemPrompt;
      this.greeting = draft.greeting ?? "";
      this.appearance = draft.appearance ?? "";
      this.initialRelationship = draft.initialRelationship ?? "";
      this.likes = draft.likes ?? "";
      this.dislikes = draft.dislikes ?? "";
      this.knownCharacters = draft.knownCharacters ?? "";
    } catch (error) {
      await this.message.error("Échec de la génération de la fiche.");
    } finally {
      this.generating = false;
    }
  }

  // Génère une photo de profil à partir des champs renseignés (apparence, nom…).
  async generateImage() {
    if (this.generatingImage) {
      return;
    }
    this.generatingImage = true;
    try {
      const image = await this.characterService.generateAvatar({
        name: this.name,
        appearance: this.appearance,
        systemPrompt: this.systemPrompt
      });
      if (image) {
        this.avatarImage = image;
      } else {
        await this.message.error("Aucune image n'a pu être générée.");
      }
    } catch (error) {
      // Trace complète en console pour le diagnostic.
      console.error("Échec génération avatar :", error);
      const text = (error as Error)?.message === "image-disabled"
        ? "Génération d'image non configurée (clés Cloudflare manquantes)."
        : `Échec de la génération de l'image. ${describeApiError(error)}`;
      await this.message.error(text);
    } finally {
      this.generatingImage = false;
    }
  }

  // Retire la photo de profil (retour à la pastille de couleur).
  removeImage() {
    this.avatarImage = "";
  }

  async save() {
    const name = this.name.trim();
    if (!name) {
      await this.message.error("Donne un nom au personnage.");
      return;
    }
    const greeting = this.greeting.trim();
    if (!greeting) {
      await this.message.error("Ajoute un message d'accueil au personnage.");
      return;
    }
    const draft = {
      name: name,
      systemPrompt: this.systemPrompt.trim(),
      greeting: greeting,
      appearance: this.appearance.trim(),
      initialRelationship: this.initialRelationship.trim(),
      likes: this.likes.trim(),
      dislikes: this.dislikes.trim(),
      knownCharacters: this.knownCharacters.trim(),
      avatarImage: this.avatarImage
    };
    if (this.isEditing()) {
      await this.characterService.update(this.characterId, draft);
    } else {
      await this.characterService.create(draft);
    }
    this.router.navigate(["characters"]);
  }

  // Retour (bouton de l'en-tête) : revient à la page précédente.
  cancel() {
    this.location.back();
  }
}
