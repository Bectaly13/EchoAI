import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, ViewWillEnter } from '@ionic/angular/standalone';
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

  goBack() {
    this.router.navigate(["characters"]);
  }

  // Fait défiler la conversation jusqu'au dernier message (après rendu).
  private scrollToBottom() {
    setTimeout(() => this.content?.scrollToBottom(200), 50);
  }
}
