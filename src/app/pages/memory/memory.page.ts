import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, ViewWillEnter } from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';

import { Character, CharacterService } from 'src/app/services/character-service';
import { ChatService, MemoryEntry } from 'src/app/services/chat-service';

import { ConfirmModalComponent } from 'src/app/components/confirm-modal/confirm-modal.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ModalComponent } from 'src/app/components/modal/modal.component';

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
  imports: [IonContent, IonHeader, FormsModule, ConfirmModalComponent, HeaderComponent, ModalComponent]
})
export class MemoryPage implements ViewWillEnter {

  // Catégories affichées, dans l'ordre, avec leur libellé.
  readonly categories: { category: MemoryCategory; label: string }[] = [
    { category: "location", label: "Lieu actuel" },
    { category: "relationship", label: "Relation avec l'utilisateur" },
    { category: "milestone", label: "Jalons de l'histoire" },
    { category: "instruction", label: "Consignes à respecter" }
  ];

  character?: Character;
  groups: MemoryGroup[] = [];

  // Modale de choix de catégorie (ajout d'un souvenir).
  addCategoryModal = { open: false };
  // Modale de saisie (réutilisée pour ajout et édition d'un souvenir).
  valueModal = {
    open: false,
    mode: "add" as "add" | "edit",
    title: "",
    hint: "",
    category: undefined as MemoryCategory | undefined,
    entry: null as MemoryEntry | null,
    value: ""
  };
  // Modale de confirmation (oublier une entrée / tout oublier).
  confirmModal = { open: false, title: "", message: "", confirmLabel: "Confirmer", action: (() => {}) as () => void };

  async ionViewWillEnter() {
    await this.loadMemory();
  }

  constructor(
    private characterService: CharacterService,
    private chatService: ChatService,
    private location: Location,
    private route: ActivatedRoute
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

  // Retour à la page précédente (le chat d'où l'on vient).
  goBack() {
    this.location.back();
  }

  // ----- Ajout / édition d'un souvenir -----

  // Étape 1 : ouvrir le choix de catégorie.
  promptAddCategory() {
    this.addCategoryModal.open = true;
  }

  // Étape 2 : catégorie choisie → ouvrir la saisie de la valeur.
  selectCategory(category: MemoryCategory) {
    this.addCategoryModal.open = false;
    const label = this.categories.find(item => item.category === category)?.label ?? "";
    this.valueModal = { open: true, mode: "add", title: "Nouveau souvenir", hint: label, category: category, entry: null, value: "" };
  }

  // Édition d'une entrée existante.
  promptEditEntry(entry: MemoryEntry) {
    this.valueModal = { open: true, mode: "edit", title: "Modifier le souvenir", hint: "", category: entry.category, entry: entry, value: entry.value };
  }

  // Validation de la modale de saisie (ajout ou édition selon le mode).
  async submitValue() {
    const value = this.valueModal.value.trim();
    const modal = this.valueModal;
    this.valueModal.open = false;
    if (!value || !this.character) {
      return;
    }
    let memory: MemoryEntry[];
    if (modal.mode === "add" && modal.category) {
      memory = await this.chatService.addMemoryEntry(this.character.id, modal.category, value);
    } else if (modal.mode === "edit" && modal.entry) {
      memory = await this.chatService.updateMemoryEntry(this.character.id, modal.entry.id, value);
    } else {
      return;
    }
    this.groups = this.groupByCategory(memory);
  }

  // ----- Suppression -----

  confirmDeleteEntry(entry: MemoryEntry) {
    this.askConfirm("Oublier ?", `Oublier « ${entry.value} » ?`, "Oublier", () => this.deleteEntry(entry));
  }

  confirmClear() {
    this.askConfirm("Tout oublier ?", "Vider toute la mémoire permanente de cette conversation ?", "Tout oublier", () => this.clear());
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

  // ----- Modale de confirmation -----
  private askConfirm(title: string, message: string, confirmLabel: string, action: () => void) {
    this.confirmModal = { open: true, title, message, confirmLabel, action };
  }

  runConfirm() {
    const action = this.confirmModal.action;
    this.confirmModal.open = false;
    action();
  }

  // Répartit les entrées par catégorie (dans l'ordre défini), en ignorant les vides.
  private groupByCategory(memory: MemoryEntry[]): MemoryGroup[] {
    return this.categories
      .map(item => ({ label: item.label, entries: memory.filter(entry => entry.category === item.category) }))
      .filter(group => group.entries.length > 0);
  }
}
