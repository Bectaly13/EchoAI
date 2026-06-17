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
    // Liste des personas que l'utilisateur peut incarner.
    path: 'personas',
    loadComponent: () => import('./pages/personas/personas.page').then((m) => m.PersonasPage),
  },
  {
    // Création d'un persona.
    path: 'persona-form',
    loadComponent: () => import('./pages/persona-form/persona-form.page').then((m) => m.PersonaFormPage),
  },
  {
    // Édition d'un persona existant (id en paramètre).
    path: 'persona-form/:id',
    loadComponent: () => import('./pages/persona-form/persona-form.page').then((m) => m.PersonaFormPage),
  },
  {
    path: '',
    redirectTo: 'characters',
    pathMatch: 'full',
  },
];
