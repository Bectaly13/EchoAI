import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    // Écran de démarrage (splash) : initialise thème/bdd/persona puis redirige.
    path: 'welcome',
    loadComponent: () => import('./pages/welcome/welcome.page').then((m) => m.WelcomePage),
  },
  {
    // Onglet : liste des personnages.
    path: 'characters',
    loadComponent: () => import('./pages/characters/characters.page').then((m) => m.CharactersPage),
  },
  {
    // Onglet : liste des conversations existantes.
    path: 'conversations',
    loadComponent: () => import('./pages/conversations/conversations.page').then((m) => m.ConversationsPage),
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
    // Mémoire permanente d'une conversation (id du personnage en paramètre).
    path: 'memory/:id',
    loadComponent: () => import('./pages/memory/memory.page').then((m) => m.MemoryPage),
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
    // Onglet : suivi (estimé) de l'utilisation des modèles (tokens).
    path: 'tokens',
    loadComponent: () => import('./pages/tokens/tokens.page').then((m) => m.TokensPage),
  },
  {
    // Onglet : paramètres (thème, version).
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: 'full',
  },
];
