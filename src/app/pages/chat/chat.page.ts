import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, ViewWillEnter, AlertController } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';

import { Character, CharacterService } from 'src/app/services/character-service';
import { ChatMessage, ChatService } from 'src/app/services/chat-service';
import { MessageService } from 'src/app/services/message-service';
import { Persona, PersonaService } from 'src/app/services/persona-service';

import { MessageBubbleComponent } from 'src/app/components/message-bubble/message-bubble.component';

import { describeApiError } from 'src/app/utils/describe-api-error';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [IonContent, FormsModule, MessageBubbleComponent]
})
export class ChatPage implements ViewWillEnter {

  // Référence à l'ion-content pour pouvoir scroller en bas automatiquement.
  @ViewChild(IonContent) content!: IonContent;

  character?: Character;
  messages: ChatMessage[] = [];
  draft = "";
  // Vrai pendant l'attente de la réponse de l'IA (désactive l'envoi).
  sending = false;
  // Personas disponibles et id de celui incarné dans cette conversation.
  personas: Persona[] = [];
  activePersonaId?: string;
  // Illustration de scène disponible (false sur le palier gratuit).
  imageEnabled = false;

  async ionViewWillEnter() {
    await this.loadConversation();
  }

  constructor(
    private alert: AlertController,
    private characterService: CharacterService,
    private chatService: ChatService,
    private message: MessageService,
    private personaService: PersonaService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

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

  // Ouvre le choix du persona incarné dans la conversation (nom + description).
  async choosePersona() {
    if (!this.character) {
      return;
    }
    const inputs = this.personas.map(persona => ({
      type: "radio" as const,
      label: this.personaOptionLabel(persona),
      value: persona.id,
      checked: persona.id === this.activePersonaId
    }));
    const alert = await this.alert.create({
      header: "Quel persona incarnes-tu ?",
      inputs: inputs,
      buttons: [
        { text: "Annuler", role: "cancel" },
        { text: "Valider", handler: (value: string) => this.applyPersona(value) }
      ]
    });
    await alert.present();
  }

  async applyPersona(personaId: string) {
    if (!this.character || !personaId) {
      return;
    }
    this.activePersonaId = personaId;
    await this.chatService.setActivePersona(this.character.id, personaId);
  }

  // Libellé d'une option de persona : nom (+ « (défaut) ») + début de description.
  private personaOptionLabel(persona: Persona): string {
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
    this.sending = true;
    // Affiche immédiatement le message de l'utilisateur (réponse optimiste).
    this.messages.push({ id: crypto.randomUUID(), role: "user", text: text, at: Date.now() });
    this.scrollToBottom();
    try {
      await this.chatService.send(this.character.id, text);
      // Recharge l'historique persisté (inclut la réponse du modèle).
      this.messages = await this.chatService.getMessages(this.character.id);
    } catch (error) {
      await this.message.error("Échec de la requête à l'IA.");
    } finally {
      this.sending = false;
      this.scrollToBottom();
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
        ? "Illustration indisponible (nécessite un plan payant Gemini)."
        : `Échec de la génération de l'illustration. ${describeApiError(error)}`;
      await this.message.error(text);
    } finally {
      this.sending = false;
      this.scrollToBottom();
    }
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
      await this.message.error("Échec de la génération.");
    } finally {
      this.sending = false;
      this.scrollToBottom();
    }
  }

  // Vrai pour le dernier message s'il vient de l'IA et qu'un message utilisateur
  // le précède : on n'autorise pas la régénération de la salutation « ancrée ».
  canRegenerate(message: ChatMessage): boolean {
    const last = this.messages[this.messages.length - 1];
    return !this.sending
      && message === last
      && message.role === "model"
      && !message.imageData
      && this.messages.some(item => item.role === "user");
  }

  // Régénère la dernière réponse de l'IA.
  async regenerate() {
    if (this.sending || !this.character) {
      return;
    }
    this.sending = true;
    try {
      await this.chatService.regenerate(this.character.id);
      this.messages = await this.chatService.getMessages(this.character.id);
    } catch (error) {
      await this.message.error("Échec de la régénération.");
    } finally {
      this.sending = false;
      this.scrollToBottom();
    }
  }

  // Le premier message (la salutation) n'est pas supprimable : pour repartir de
  // zéro, on passe par « Réinitialiser la conversation ».
  canDelete(message: ChatMessage): boolean {
    return message !== this.messages[0];
  }

  // Demande confirmation avant de réinitialiser toute la conversation.
  async confirmReset() {
    const alert = await this.alert.create({
      header: "Réinitialiser ?",
      message: "Effacer tous les messages et la mémoire de cette conversation, et repartir de la salutation ?",
      buttons: [
        { text: "Annuler", role: "cancel" },
        { text: "Réinitialiser", role: "destructive", handler: () => this.reset() }
      ]
    });
    await alert.present();
  }

  async reset() {
    if (!this.character) {
      return;
    }
    this.messages = await this.chatService.resetConversation(this.character.id);
    this.scrollToBottom();
  }

  // Demande confirmation avant de supprimer un message et tous les suivants.
  async confirmDelete(message: ChatMessage) {
    const alert = await this.alert.create({
      header: "Supprimer ?",
      message: "Supprimer ce message et tous les suivants ?",
      buttons: [
        { text: "Annuler", role: "cancel" },
        { text: "Supprimer", role: "destructive", handler: () => this.deleteFrom(message) }
      ]
    });
    await alert.present();
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

  goBack() {
    this.router.navigate(["characters"]);
  }

  // Fait défiler la conversation jusqu'au dernier message (après rendu).
  private scrollToBottom() {
    setTimeout(() => this.content?.scrollToBottom(200), 50);
  }
}
