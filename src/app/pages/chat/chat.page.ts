import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonIcon, ViewWillEnter } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { sparkles } from 'ionicons/icons';

import { Character, CharacterService } from 'src/app/services/character-service';
import { ChatMessage, ChatService } from 'src/app/services/chat-service';
import { MessageService } from 'src/app/services/message-service';
import { Persona, PersonaService } from 'src/app/services/persona-service';

import { ConfirmModalComponent } from 'src/app/components/confirm-modal/confirm-modal.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { MessageBubbleComponent } from 'src/app/components/message-bubble/message-bubble.component';
import { ModalComponent } from 'src/app/components/modal/modal.component';

import { describeApiError } from 'src/app/utils/describe-api-error';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonIcon, FormsModule, ConfirmModalComponent, HeaderComponent, MessageBubbleComponent, ModalComponent]
})
export class ChatPage implements ViewWillEnter {

  // Référence à l'ion-content pour pouvoir scroller en bas automatiquement.
  @ViewChild(IonContent) content!: IonContent;
  // Référence au champ de saisie (textarea) pour ajuster sa hauteur au contenu.
  @ViewChild("draftInput") draftInput?: ElementRef<HTMLTextAreaElement>;

  character?: Character;
  messages: ChatMessage[] = [];
  draft = "";
  // Vrai pendant l'attente de la réponse de l'IA (désactive l'envoi).
  sending = false;
  // Vrai pendant une régénération : on n'affiche alors PAS l'indicateur de saisie
  // (on remplace un message existant, pas d'attente d'un nouveau message).
  regenerating = false;
  // Personas disponibles et id de celui incarné dans cette conversation.
  personas: Persona[] = [];
  activePersonaId?: string;
  // Illustration de scène disponible (false sur le palier gratuit).
  imageEnabled = false;
  // Modale de sélection du persona.
  personaModal = { open: false };
  // Modale d'édition d'un message (texte modifiable).
  editModal = { open: false, messageId: "", value: "" };
  // Modale d'ajout d'un aparté hors-personnage (OOC).
  oocModal = { open: false, value: "" };
  // Modale de confirmation (réutilisée pour reset / suppression de message).
  confirmModal = { open: false, title: "", message: "", confirmLabel: "Confirmer", action: (() => {}) as () => void };

  async ionViewWillEnter() {
    await this.loadConversation();
  }

  constructor(
    private characterService: CharacterService,
    private chatService: ChatService,
    private message: MessageService,
    private personaService: PersonaService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Icône de l'indicateur « l'IA écrit » (étoile qui tourne).
    addIcons({ sparkles });
  }

  // Charge le personnage et l'historique à partir de l'id présent dans l'URL.
  async loadConversation() {
    this.imageEnabled = this.chatService.canIllustrate();
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.goBack();
      return;
    }
    this.character = await this.characterService.get(id);
    this.messages = await this.chatService.getMessages(id);
    this.personas = await this.personaService.list();
    this.activePersonaId = await this.chatService.getActivePersonaId(id);
    this.scrollToBottom();
  }

  // Libellé du bouton de persona : nom du persona actif.
  activePersonaLabel(): string {
    const persona = this.personas.find(item => item.id === this.activePersonaId);
    return persona ? persona.name : "Persona";
  }

  // Ouvre la modale de choix du persona incarné dans la conversation.
  choosePersona() {
    if (this.character) {
      this.personaModal.open = true;
    }
  }

  async applyPersona(personaId: string) {
    if (!this.character || !personaId) {
      return;
    }
    this.activePersonaId = personaId;
    await this.chatService.setActivePersona(this.character.id, personaId);
    this.personaModal.open = false;
  }

  // Libellé d'une option de persona : nom (+ « (défaut) ») + début de description.
  personaOptionLabel(persona: Persona): string {
    const name = persona.isDefault ? `${persona.name} (défaut)` : persona.name;
    const description = persona.description?.trim();
    if (!description) {
      return name;
    }
    const short = description.length > 80 ? `${description.slice(0, 80).trim()}…` : description;
    return `${name} — ${short}`;
  }

  async send() {
    const text = this.draft.trim();
    if (!text || this.sending || !this.character) {
      return;
    }
    this.draft = "";
    this.resetDraftHeight();
    this.sending = true;
    // Affiche immédiatement le message de l'utilisateur (réponse optimiste).
    this.messages.push({ id: crypto.randomUUID(), role: "user", text: text, at: Date.now() });
    this.scrollToBottom();
    try {
      await this.chatService.send(this.character.id, text);
      // Recharge l'historique persisté (inclut la réponse du modèle).
      this.messages = await this.chatService.getMessages(this.character.id);
    } catch (error) {
      // Rien n'a été persisté (échec avant la sauvegarde) : on recharge pour retirer la
      // bulle utilisateur optimiste, et on rend son texte au champ pour réessayer/reformuler.
      this.messages = await this.chatService.getMessages(this.character.id);
      this.draft = text;
      await this.message.error(this.generationError(error, "Échec de la requête à l'IA."));
    } finally {
      this.sending = false;
      this.scrollToBottom();
    }
  }

  // La touche Entrée envoie le message (le clavier Android n'a pas de bouton dédié) :
  // on empêche l'insertion du saut de ligne. Maj+Entrée ne passe pas par ici (Angular
  // ne déclenche pas keydown.enter avec un modificateur) et insère donc un retour ligne.
  sendFromKeyboard(event: Event) {
    event.preventDefault();
    this.send();
  }

  // Ajuste la hauteur du champ de saisie à son contenu (jusqu'au plafond fixé en CSS,
  // au-delà le champ devient défilable).
  autoGrowDraft() {
    const textarea = this.draftInput?.nativeElement;
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  // Ramène le champ de saisie à sa hauteur d'une ligne (après envoi, draft vidé).
  private resetDraftHeight() {
    const textarea = this.draftInput?.nativeElement;
    if (textarea) {
      textarea.style.height = "auto";
    }
  }

  // Génère une illustration de la scène courante, ajoutée comme message-image.
  async illustrate() {
    if (this.sending || !this.character) {
      return;
    }
    this.sending = true;
    this.scrollToBottom();
    try {
      this.messages = await this.chatService.illustrateScene(this.character.id);
    } catch (error) {
      // Trace complète en console pour le diagnostic.
      console.error("Échec génération illustration :", error);
      const text = (error as Error)?.message === "image-disabled"
        ? "Illustration non configurée (clés Cloudflare manquantes)."
        : `Échec de la génération de l'illustration. ${describeApiError(error)}`;
      await this.message.error(text);
    } finally {
      this.sending = false;
      this.scrollToBottom();
    }
  }

  // Ouvre la modale d'ajout d'un aparté hors-personnage (OOC).
  openOoc() {
    if (!this.sending && this.character) {
      this.oocModal = { open: true, value: "" };
    }
  }

  // Enregistre l'aparté OOC (sans déclencher de réponse) et recharge l'historique.
  async saveOoc() {
    if (!this.character) {
      return;
    }
    await this.chatService.addOocNote(this.character.id, this.oocModal.value);
    this.messages = await this.chatService.getMessages(this.character.id);
    this.oocModal.open = false;
    this.scrollToBottom();
  }

  // L'utilisateur passe son tour : laisse le personnage IA enchaîner de lui-même.
  async skip() {
    if (this.sending || !this.character) {
      return;
    }
    this.sending = true;
    this.scrollToBottom();
    try {
      this.messages = await this.chatService.skipTurn(this.character.id);
    } catch (error) {
      await this.message.error(this.generationError(error, "Échec de la génération."));
    } finally {
      this.sending = false;
      this.scrollToBottom();
    }
  }

  // Vrai pour le dernier message s'il vient de l'IA : on régénère uniquement la
  // dernière réponse, hors salutation « ancrée » (premier message) et hors image.
  // (Le blocage pendant une action en cours se fait via [disabled], pas ici.)
  canRegenerate(message: ChatMessage): boolean {
    const last = this.messages[this.messages.length - 1];
    return message === last
      && message.role === "model"
      && !message.imageData
      && message !== this.messages[0];
  }

  // Régénère la dernière réponse de l'IA.
  async regenerate() {
    if (this.sending || !this.character) {
      return;
    }
    this.sending = true;
    this.regenerating = true;
    try {
      await this.chatService.regenerate(this.character.id);
      this.messages = await this.chatService.getMessages(this.character.id);
    } catch (error) {
      await this.message.error(this.generationError(error, "Échec de la régénération."));
    } finally {
      this.sending = false;
      this.regenerating = false;
      this.scrollToBottom();
    }
  }

  // Le premier message (la salutation) n'est pas supprimable : pour repartir de
  // zéro, on passe par « Réinitialiser la conversation ». (Le blocage pendant une
  // action en cours se fait via [disabled], pas ici.)
  canDelete(message: ChatMessage): boolean {
    return message !== this.messages[0];
  }

  // Vrai si le message est éditable : tout message porteur de texte sauf la salutation
  // (premier message) ; les messages-image (sans texte) ne le sont pas.
  canEdit(message: ChatMessage): boolean {
    return message !== this.messages[0] && !message.imageData;
  }

  // Ouvre la modale d'édition, pré-remplie avec le texte du message.
  openEdit(message: ChatMessage) {
    this.editModal = { open: true, messageId: message.id, value: message.text };
  }

  // Enregistre l'édition (ne régénère pas la suite ni la mémoire) et recharge l'historique.
  async saveEdit() {
    if (!this.character) {
      return;
    }
    await this.chatService.editMessage(this.character.id, this.editModal.messageId, this.editModal.value);
    this.messages = await this.chatService.getMessages(this.character.id);
    this.editModal.open = false;
  }

  // Demande confirmation avant de réinitialiser toute la conversation.
  confirmReset() {
    this.askConfirm(
      "Réinitialiser ?",
      "Effacer tous les messages et la mémoire de cette conversation, et repartir de la salutation ?",
      "Réinitialiser",
      () => this.reset()
    );
  }

  async reset() {
    if (!this.character) {
      return;
    }
    this.messages = await this.chatService.resetConversation(this.character.id);
    this.scrollToBottom();
  }

  // Demande confirmation avant de supprimer un message et tous les suivants.
  confirmDelete(message: ChatMessage) {
    this.askConfirm(
      "Supprimer ?",
      "Supprimer ce message et tous les suivants ?",
      "Supprimer",
      () => this.deleteFrom(message)
    );
  }

  async deleteFrom(message: ChatMessage) {
    if (!this.character) {
      return;
    }
    this.messages = await this.chatService.deleteFrom(this.character.id, message.id);
  }

  goToMemory() {
    if (this.character) {
      this.router.navigate(["memory", this.character.id]);
    }
  }

  // Message d'erreur d'une génération : distingue une réponse vide après re-tirages
  // (blocage de contenu côté Google) d'un échec technique (réseau, quota…), pour guider
  // l'utilisateur sur la marche à suivre.
  private generationError(error: unknown, fallback: string): string {
    if ((error as Error)?.message === "empty-response") {
      return "La réponse a été bloquée (contenu jugé sensible). Réessaie ou reformule ton message.";
    }
    return fallback;
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

  // Retour à la liste des conversations (destination fixe, pas de Location.back).
  goBack() {
    this.router.navigate(["conversations"]);
  }

  // Fait défiler la conversation jusqu'au dernier message (après rendu).
  private scrollToBottom() {
    setTimeout(() => this.content?.scrollToBottom(200), 50);
  }
}
