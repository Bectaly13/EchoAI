import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';

import { ChatService, PersonaUsage } from 'src/app/services/chat-service';
import { MessageService } from 'src/app/services/message-service';
import { PersonaGender, PersonaService } from 'src/app/services/persona-service';

import { HeaderComponent } from 'src/app/components/header/header.component';

@Component({
  selector: 'app-persona-form',
  templateUrl: './persona-form.page.html',
  styleUrls: ['./persona-form.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, FormsModule, HeaderComponent]
})
export class PersonaFormPage implements ViewWillEnter {

  // Id du persona en cours d'édition (vide en mode création).
  personaId = "";
  name = "";
  description = "";
  // Apparence physique (facultative), pour la cohérence et l'immersion.
  appearance = "";
  // Âge (facultatif), pour renforcer le cadre « adulte » transmis à l'IA.
  age = "";
  // Genre du persona (« Homme » par défaut en création).
  gender: PersonaGender = "male";
  // Options du sélecteur de genre.
  readonly genderOptions: { value: PersonaGender; label: string }[] = [
    { value: "male", label: "Homme" },
    { value: "female", label: "Femme" },
    { value: "other", label: "Autre" }
  ];
  // Personnages (nom + avatar) dont la conversation incarne ce persona (mode édition).
  activeInConversations: PersonaUsage[] = [];

  async ionViewWillEnter() {
    await this.loadIfEditing();
  }

  constructor(
    private chatService: ChatService,
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
    this.appearance = persona.appearance ?? "";
    this.age = persona.age ?? "";
    this.gender = persona.gender ?? "male";
    this.activeInConversations = await this.chatService.conversationsUsingPersona(persona.id);
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
    const changes = { name: name, description: this.description.trim(), appearance: this.appearance.trim(), age: this.age.trim(), gender: this.gender };
    if (this.isEditing()) {
      await this.personaService.update(this.personaId, changes);
    } else {
      await this.personaService.create(changes.name, changes.description, changes.gender, changes.appearance, changes.age);
    }
    this.router.navigate(["personas"]);
  }
}
