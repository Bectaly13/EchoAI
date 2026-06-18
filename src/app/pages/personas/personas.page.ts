import { Component } from '@angular/core';
import { IonContent, IonHeader, ViewWillEnter, AlertController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

import { Persona, PersonaService } from 'src/app/services/persona-service';

import { HeaderComponent } from 'src/app/components/header/header.component';
import { NavbarComponent } from 'src/app/components/navbar/navbar.component';

@Component({
  selector: 'app-personas',
  templateUrl: './personas.page.html',
  styleUrls: ['./personas.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, HeaderComponent, NavbarComponent]
})
export class PersonasPage implements ViewWillEnter {

  personas: Persona[] = [];

  async ionViewWillEnter() {
    await this.loadPersonas();
  }

  constructor(
    private alert: AlertController,
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
  async confirmRemove(persona: Persona) {
    const alert = await this.alert.create({
      header: "Supprimer ?",
      message: `Supprimer le persona « ${persona.name} » ?`,
      buttons: [
        { text: "Annuler", role: "cancel" },
        { text: "Supprimer", role: "destructive", handler: () => this.remove(persona) }
      ]
    });
    await alert.present();
  }

  async remove(persona: Persona) {
    await this.personaService.remove(persona.id);
    await this.loadPersonas();
  }
}
