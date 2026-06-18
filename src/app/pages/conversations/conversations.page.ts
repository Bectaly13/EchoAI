import { Component } from '@angular/core';
import { IonContent, IonHeader, ViewWillEnter, AlertController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

import { ChatService, ConversationSummary } from 'src/app/services/chat-service';

import { HeaderComponent } from 'src/app/components/header/header.component';
import { NavbarComponent } from 'src/app/components/navbar/navbar.component';

@Component({
  selector: 'app-conversations',
  templateUrl: './conversations.page.html',
  styleUrls: ['./conversations.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, HeaderComponent, NavbarComponent]
})
export class ConversationsPage implements ViewWillEnter {

  conversations: ConversationSummary[] = [];

  async ionViewWillEnter() {
    await this.loadConversations();
  }

  constructor(
    private alert: AlertController,
    private chatService: ChatService,
    private router: Router
  ) { }

  async loadConversations() {
    this.conversations = await this.chatService.listConversations();
  }

  openConversation(conversation: ConversationSummary) {
    this.router.navigate(["chat", conversation.characterId]);
  }

  // Demande confirmation avant de supprimer une conversation (le personnage reste).
  async confirmDelete(conversation: ConversationSummary, event: Event) {
    event.stopPropagation();
    const alert = await this.alert.create({
      header: "Supprimer ?",
      message: `Supprimer la conversation avec « ${conversation.characterName} » ? Le personnage est conservé.`,
      buttons: [
        { text: "Annuler", role: "cancel" },
        { text: "Supprimer", role: "destructive", handler: () => this.remove(conversation) }
      ]
    });
    await alert.present();
  }

  async remove(conversation: ConversationSummary) {
    await this.chatService.deleteConversation(conversation.characterId);
    await this.loadConversations();
  }
}
