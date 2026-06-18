import { Component } from '@angular/core';
import { IonContent, IonHeader, ViewWillEnter, AlertController } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';

import { Character, CharacterService } from 'src/app/services/character-service';
import { ChatService, MemoryEntry } from 'src/app/services/chat-service';

import { HeaderComponent } from 'src/app/components/header/header.component';

import { MemoryCategory } from 'src/app/utils/parse-memory';

// Une catégorie de mémoire et son libellé affiché.
interface MemoryGroup {
  label: string;
  entries: MemoryEntry[];
}

@Component({
  selector: 'app-memory',
  templateUrl: './memory.page.html',
  styleUrls: ['./memory.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, HeaderComponent]
})
export class MemoryPage implements ViewWillEnter {

  // Catégories affichées, dans l'ordre, avec leur libellé.
  private readonly categories: { category: MemoryCategory; label: string }[] = [
    { category: "location", label: "Lieu actuel" },
    { category: "relationship", label: "Relation avec l'utilisateur" },
    { category: "milestone", label: "Jalons de l'histoire" },
    { category: "instruction", label: "Consignes à respecter" }
  ];

  character?: Character;
  groups: MemoryGroup[] = [];

  async ionViewWillEnter() {
    await this.loadMemory();
  }

  constructor(
    private alert: AlertController,
    private characterService: CharacterService,
    private chatService: ChatService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  async loadMemory() {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.goBack();
      return;
    }
    this.character = await this.characterService.get(id);
    const memory = await this.chatService.getMemory(id);
    this.groups = this.groupByCategory(memory);
  }

  // Vrai s'il n'y a aucune entrée de mémoire à afficher.
  isEmpty(): boolean {
    return this.groups.length === 0;
  }

  goBack() {
    const id = this.route.snapshot.paramMap.get("id");
    this.router.navigate(["chat", id]);
  }

  // Ajout d'un souvenir : on choisit d'abord la catégorie, puis on saisit la valeur.
  // On enchaîne via onDidDismiss (et non depuis le handler) pour éviter une
  // présentation imbriquée d'alertes — qui empêchait le rafraîchissement de la liste.
  async promptAddCategory() {
    const alert = await this.alert.create({
      header: "Ajouter un souvenir",
      message: "Dans quelle catégorie ?",
      inputs: this.categories.map((item, index) => ({
        type: "radio" as const,
        label: item.label,
        value: item.category,
        checked: index === 0
      })),
      buttons: [
        { text: "Annuler", role: "cancel" },
        { text: "Suivant", role: "confirm" }
      ]
    });
    await alert.present();
    const { data, role } = await alert.onDidDismiss<{ values: MemoryCategory }>();
    if (role !== "confirm") {
      return;
    }
    await this.promptAddValue(data?.values);
  }

  async promptAddValue(category?: MemoryCategory) {
    if (!category) {
      return;
    }
    const label = this.categories.find(item => item.category === category)?.label ?? "";
    const alert = await this.alert.create({
      header: "Nouveau souvenir",
      message: label,
      inputs: [{ name: "value", type: "textarea", placeholder: "Ce dont le personnage doit se souvenir." }],
      buttons: [
        { text: "Annuler", role: "cancel" },
        { text: "Ajouter", role: "confirm" }
      ]
    });
    await alert.present();
    const { data, role } = await alert.onDidDismiss<{ values: { value: string } }>();
    if (role !== "confirm") {
      return;
    }
    await this.addEntry(category, data?.values?.value ?? "");
  }

  private async addEntry(category: MemoryCategory, value: string) {
    if (!this.character) {
      return;
    }
    const memory = await this.chatService.addMemoryEntry(this.character.id, category, value);
    this.groups = this.groupByCategory(memory);
  }

  // Édition de la valeur d'une entrée existante.
  async promptEditEntry(entry: MemoryEntry) {
    const alert = await this.alert.create({
      header: "Modifier le souvenir",
      inputs: [{ name: "value", type: "textarea", value: entry.value }],
      buttons: [
        { text: "Annuler", role: "cancel" },
        { text: "Enregistrer", handler: (data: { value: string }) => this.editEntry(entry, data.value) }
      ]
    });
    await alert.present();
  }

  private async editEntry(entry: MemoryEntry, value: string) {
    if (!this.character) {
      return;
    }
    const memory = await this.chatService.updateMemoryEntry(this.character.id, entry.id, value);
    this.groups = this.groupByCategory(memory);
  }

  // Demande confirmation avant de supprimer une entrée de mémoire.
  async confirmDeleteEntry(entry: MemoryEntry) {
    const alert = await this.alert.create({
      header: "Oublier ?",
      message: `Oublier « ${entry.value} » ?`,
      buttons: [
        { text: "Annuler", role: "cancel" },
        { text: "Oublier", role: "destructive", handler: () => this.deleteEntry(entry) }
      ]
    });
    await alert.present();
  }

  // Demande confirmation avant de vider toute la mémoire.
  async confirmClear() {
    const alert = await this.alert.create({
      header: "Tout oublier ?",
      message: "Vider toute la mémoire permanente de cette conversation ?",
      buttons: [
        { text: "Annuler", role: "cancel" },
        { text: "Tout oublier", role: "destructive", handler: () => this.clear() }
      ]
    });
    await alert.present();
  }

  private async deleteEntry(entry: MemoryEntry) {
    if (!this.character) {
      return;
    }
    const memory = await this.chatService.deleteMemoryEntry(this.character.id, entry.id);
    this.groups = this.groupByCategory(memory);
  }

  private async clear() {
    if (!this.character) {
      return;
    }
    await this.chatService.clearMemory(this.character.id);
    this.groups = [];
  }

  // Répartit les entrées par catégorie (dans l'ordre défini), en ignorant les vides.
  private groupByCategory(memory: MemoryEntry[]): MemoryGroup[] {
    return this.categories
      .map(item => ({ label: item.label, entries: memory.filter(entry => entry.category === item.category) }))
      .filter(group => group.entries.length > 0);
  }
}
