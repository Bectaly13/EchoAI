import { Component, computed, input } from '@angular/core';

import { ChatMessage } from 'src/app/services/chat-service';

import { formatNarration, TextSegment } from 'src/app/utils/format-narration';

@Component({
  selector: 'app-message-bubble',
  templateUrl: './message-bubble.component.html',
  styleUrls: ['./message-bubble.component.scss'],
})
export class MessageBubbleComponent {

  // Le message à afficher.
  message = input.required<ChatMessage>();

  // Segments du message : alterne paroles (texte normal) et narration (astérisques).
  segments = computed<TextSegment[]>(() => formatNarration(this.message().text));

  // Vrai si le message vient de l'utilisateur (sert à aligner/styliser la bulle).
  isUser(): boolean {
    return this.message().role === "user";
  }
}
