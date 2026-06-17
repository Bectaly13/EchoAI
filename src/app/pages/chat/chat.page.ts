import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, ViewWillEnter, AlertController } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';

import { Character, CharacterService } from 'src/app/services/character-service';
import { ChatMessage, ChatService } from 'src/app/services/chat-service';
import { MessageService } from 'src/app/services/message-service';

import { MessageBubbleComponent } from 'src/app/components/message-bubble/message-bubble.component';

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

  async ionViewWillEnter() {
    await this.loadConversation();
  }

  constructor(
    private alert: AlertController,
    private characterService: CharacterService,
    private chatService: ChatService,
    private message: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  // Charge le personnage et l'historique à partir de l'id présent dans l'URL.
  async loadConversation() {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.goBack();
      return;
    }
    this.character = await this.characterService.get(id);
    this.messages = await this.chatService.getMessages(id);
    this.scrollToBottom();
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

  // Vrai pour le dernier message s'il vient de l'IA et qu'un message utilisateur
  // le précède : on n'autorise pas la régénération de la salutation « ancrée ».
  canRegenerate(message: ChatMessage): boolean {
    const last = this.messages[this.messages.length - 1];
    return !this.sending
      && message === last
      && message.role === "model"
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

  goBack() {
    this.router.navigate(["characters"]);
  }

  // Fait défiler la conversation jusqu'au dernier message (après rendu).
  private scrollToBottom() {
    setTimeout(() => this.content?.scrollToBottom(200), 50);
  }
}
