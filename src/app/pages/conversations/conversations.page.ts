import { Component } from '@angular/core';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

import { Character, CharacterService } from 'src/app/services/character-service';
import { ChatService, ConversationSummary } from 'src/app/services/chat-service';

import { ConfirmModalComponent } from 'src/app/components/confirm-modal/confirm-modal.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ModalComponent } from 'src/app/components/modal/modal.component';
import { NavbarComponent } from 'src/app/components/navbar/navbar.component';

@Component({
  selector: 'app-conversations',
  templateUrl: './conversations.page.html',
  styleUrls: ['./conversations.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, ConfirmModalComponent, HeaderComponent, ModalComponent, NavbarComponent]
})
export class ConversationsPage implements ViewWillEnter {

  conversations: ConversationSummary[] = [];
  // Personnages disponibles (pour démarrer une nouvelle conversation).
  characters: Character[] = [];
  // Modale de sélection d'un personnage pour démarrer une conversation.
  newConversationModal = { open: false };
  // État de la modale de confirmation (réutilisée pour toutes les confirmations).
  confirmModal = { open: false, title: "", message: "", confirmLabel: "Confirmer", action: (() => {}) as () => void };

  async ionViewWillEnter() {
    await this.loadConversations();
    await this.loadCharacters();
  }

  constructor(
    private characterService: CharacterService,
    private chatService: ChatService,
    private router: Router
  ) { }

  async loadConversations() {
    this.conversations = await this.chatService.listConversations();
  }

  async loadCharacters() {
    this.characters = await this.characterService.list();
  }

  openConversation(conversation: ConversationSummary) {
    this.router.navigate(["chat", conversation.characterId]);
  }

  // Ouvre la modale de choix d'un personnage pour démarrer une conversation.
  openNewConversation() {
    this.newConversationModal.open = true;
  }

  // Démarre (ou rouvre) la conversation avec le personnage choisi.
  startConversation(character: Character) {
    this.newConversationModal.open = false;
    this.router.navigate(["chat", character.id]);
  }

  // Demande confirmation avant de supprimer une conversation (le personnage reste).
  confirmDelete(conversation: ConversationSummary, event: Event) {
    event.stopPropagation();
    this.askConfirm(
      "Supprimer ?",
      `Supprimer la conversation avec « ${conversation.characterName} » ? Le personnage est conservé.`,
      "Supprimer",
      () => this.remove(conversation)
    );
  }

  async remove(conversation: ConversationSummary) {
    await this.chatService.deleteConversation(conversation.characterId);
    await this.loadConversations();
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
