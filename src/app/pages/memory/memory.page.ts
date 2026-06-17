import { Component } from '@angular/core';
import { IonContent, ViewWillEnter, AlertController } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';

import { Character, CharacterService } from 'src/app/services/character-service';
import { ChatService, MemoryEntry } from 'src/app/services/chat-service';

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
  imports: [IonContent]
})
export class MemoryPage implements ViewWillEnter {

  // Catégories affichées, dans l'ordre, avec leur libellé.
  private readonly categories = [
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
