import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  // Service d'affichage de messages courts à l'utilisateur (toasts).

  constructor(
    private toast: ToastController
  ) { }

  // Affiche un message d'information neutre.
  async info(text: string) {
    await this.present(text, "medium");
  }

  // Affiche un message d'erreur.
  async error(text: string) {
    await this.present(text, "danger");
  }

  private async present(text: string, color: string) {
    const toast = await this.toast.create({
      message: text,
      duration: 2500,
      position: "bottom",
      color: color
    });
    await toast.present();
  }
}
