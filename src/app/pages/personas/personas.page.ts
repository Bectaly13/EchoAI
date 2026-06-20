import { Component } from '@angular/core';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

import { Persona, PersonaService } from 'src/app/services/persona-service';

import { ConfirmModalComponent } from 'src/app/components/confirm-modal/confirm-modal.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { NavbarComponent } from 'src/app/components/navbar/navbar.component';

@Component({
  selector: 'app-personas',
  templateUrl: './personas.page.html',
  styleUrls: ['./personas.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, ConfirmModalComponent, HeaderComponent, NavbarComponent]
})
export class PersonasPage implements ViewWillEnter {

  personas: Persona[] = [];
  confirmModal = { open: false, title: "", message: "", confirmLabel: "Confirmer", action: (() => {}) as () => void };

  async ionViewWillEnter() {
    await this.loadPersonas();
  }

  constructor(
    private personaService: PersonaService,
    private router: Router
  ) { }

  async loadPersonas() {
    this.personas = await this.personaService.list();
  }

  goToCreate() {
    this.router.navigate(["persona-form"]);
  }

  goToEdit(persona: Persona) {
    this.router.navigate(["persona-form", persona.id]);
  }

  // Première lettre du nom, affichée dans la pastille.
  initial(persona: Persona): string {
    return persona.name.charAt(0).toUpperCase();
  }

  // Demande confirmation avant de supprimer un persona.
  confirmRemove(persona: Persona) {
    this.askConfirm(
      "Supprimer ?",
      `Supprimer le persona « ${persona.name} » ?`,
      "Supprimer",
      () => this.remove(persona)
    );
  }

  async remove(persona: Persona) {
    await this.personaService.remove(persona.id);
    await this.loadPersonas();
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
