import { Component, computed, input, output } from '@angular/core';

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
  // Affiche le bouton de régénération (réservé au dernier message de l'IA).
  canRegenerate = input<boolean>(false);
  // Affiche le bouton d'édition (masqué sur le premier message / salutation et les images).
  canEdit = input<boolean>(false);
  // Affiche le bouton de suppression (masqué sur le premier message / salutation).
  canDelete = input<boolean>(true);
  // Grise (désactive) les boutons d'action pendant qu'une action est en cours.
  disabled = input<boolean>(false);

  // Segments du message : alterne paroles (texte normal) et narration (astérisques).
  segments = computed<TextSegment[]>(() => formatNarration(this.message().text));

  // Régénérer ce message (réponse de l'IA).
  regenerate = output<void>();
  // Éditer ce message (ouvre une modale côté page).
  edit = output<void>();
  // Supprimer ce message et tous les suivants.
  remove = output<void>();

  // Vrai si le message vient de l'utilisateur (sert à aligner/styliser la bulle).
  isUser(): boolean {
    return this.message().role === "user";
  }
}
