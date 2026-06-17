import { Component, input } from '@angular/core';

import { ChatMessage } from 'src/app/services/chat-service';

@Component({
  selector: 'app-message-bubble',
  templateUrl: './message-bubble.component.html',
  styleUrls: ['./message-bubble.component.scss'],
})
export class MessageBubbleComponent {

  // Le message à afficher.
  message = input.required<ChatMessage>();

  // Vrai si le message vient de l'utilisateur (sert à aligner/styliser la bulle).
  isUser(): boolean {
    return this.message().role === "user";
  }
}
