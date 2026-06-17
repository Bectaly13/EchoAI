import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, ViewWillEnter } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';

import { MessageService } from 'src/app/services/message-service';
import { PersonaService } from 'src/app/services/persona-service';

@Component({
  selector: 'app-persona-form',
  templateUrl: './persona-form.page.html',
  styleUrls: ['./persona-form.page.scss'],
  standalone: true,
  imports: [IonContent, FormsModule]
})
export class PersonaFormPage implements ViewWillEnter {

  // Id du persona en cours d'édition (vide en mode création).
  personaId = "";
  name = "";
  description = "";

  async ionViewWillEnter() {
    await this.loadIfEditing();
  }

  constructor(
    private messageService: MessageService,
    private personaService: PersonaService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  // Mode édition : pré-remplit le formulaire si un id est présent dans l'URL.
  async loadIfEditing() {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      return;
    }
    const persona = await this.personaService.get(id);
    if (!persona) {
      return;
    }
    this.personaId = persona.id;
    this.name = persona.name;
    this.description = persona.description;
  }

  isEditing(): boolean {
    return !!this.personaId;
  }

  async save() {
    const name = this.name.trim();
    if (!name) {
      await this.messageService.error("Donne un nom au persona.");
      return;
    }
    const changes = { name: name, description: this.description.trim() };
    if (this.isEditing()) {
      await this.personaService.update(this.personaId, changes);
    } else {
      await this.personaService.create(changes.name, changes.description);
    }
    this.router.navigate(["personas"]);
  }

  cancel() {
    this.router.navigate(["personas"]);
  }
}
