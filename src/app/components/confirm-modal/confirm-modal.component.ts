import { Component, input, output } from '@angular/core';

import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-confirm-modal',
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.scss'],
  standalone: true,
  imports: [ModalComponent]
})
export class ConfirmModalComponent {

  open = input<boolean>(false);
  title = input<string>("");
  message = input<string>("");
  confirmLabel = input<string>("Confirmer");
  // Émis sur validation / annulation (ou fermeture par le fond).
  confirm = output<void>();
  cancelled = output<void>();
}
