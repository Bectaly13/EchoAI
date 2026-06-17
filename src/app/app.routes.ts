import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'characters',
    loadComponent: () => import('./pages/characters/characters.page').then((m) => m.CharactersPage),
  },
  {
    // Création d'un personnage.
    path: 'character-form',
    loadComponent: () => import('./pages/character-form/character-form.page').then((m) => m.CharacterFormPage),
  },
  {
    // Édition d'un personnage existant (id en paramètre).
    path: 'character-form/:id',
    loadComponent: () => import('./pages/character-form/character-form.page').then((m) => m.CharacterFormPage),
  },
  {
    // Conversation avec un personnage (id en paramètre).
    path: 'chat/:id',
    loadComponent: () => import('./pages/chat/chat.page').then((m) => m.ChatPage),
  },
  {
    path: '',
    redirectTo: 'characters',
    pathMatch: 'full',
  },
];
