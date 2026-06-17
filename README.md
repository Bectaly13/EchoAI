# Character Chat

Application mobile/web où l'utilisateur crée des **personnages** (chacun avec sa propre personnalité) et discute avec eux. Chaque réponse est générée par l'IA **Gemini** de Google, appelée en HTTP.

Construit avec **Ionic 8** et **Angular 20** (composants standalone). Les données utilisateur sont stockées **localement** sur l'appareil (Ionic Storage), sans serveur ni compte.

---

## Fonctionnalités

> Pour l'instant l'application couvre l'essentiel ; d'autres fonctionnalités suivront.

### Personnages
- **Créer un personnage** : un nom, une « personnalité » (instructions envoyées à l'IA comme *system prompt*), un **message d'accueil** optionnel, et des **détails optionnels** (apparence, relation initiale avec l'utilisateur, goûts, ce qu'il n'aime pas, personnages qu'il connaît). Une couleur d'avatar est attribuée au hasard.
- **Lister les personnages** : la liste affiche tous les personnages, du plus récent au plus ancien.
- **Modifier un personnage** : le nom et la personnalité sont éditables à tout moment.
- **Supprimer un personnage** : avec confirmation ; la conversation associée est supprimée en même temps.

### Personas
- **Définir des personas** : l'utilisateur crée des personas (nom + description : qui il est, son histoire, ses pouvoirs…) qu'il peut incarner.
- **Incarner un persona** : dans chaque conversation, on choisit le persona incarné (ou aucun) ; ces infos sont transmises au personnage IA.

### Conversation
- **Discuter avec un personnage** : chaque personnage a sa propre conversation, persistée localement.
- **Message d'accueil** : si le personnage en a un, c'est le premier message affiché (côté IA) à l'ouverture de la conversation.
- **Réponses de l'IA** : les messages sont envoyés à Gemini avec la personnalité du personnage et l'historique de la conversation comme contexte.
- **Narration** : les passages encadrés d'astérisques (`*il sourit*`) sont mis en forme (italique, grisé) pour distinguer la narration des paroles.
- **Dialogue** : l'IA préfixe les répliques par le nom de celui qui parle et met les paroles entre guillemets (`Alice : "Bonjour"`), pratique quand plusieurs personnages interviennent.
- **Affichage optimiste** : le message de l'utilisateur apparaît immédiatement, puis la réponse du modèle ; la zone défile automatiquement vers le dernier message.
- **Régénérer / supprimer** : on peut régénérer la dernière réponse de l'IA, ou supprimer un message (et tous les suivants, avec confirmation).
- **Passer son tour** : un bouton laisse le personnage IA enchaîner un message de lui-même, sans qu'on ait à écrire.
- **Mémoire permanente** : l'IA mémorise d'elle-même les éléments durables de l'histoire (lieu courant, évolution de la relation, jalons, consignes) et les conserve d'un message à l'autre pour une meilleure fidélité, sans rien afficher de technique. Un écran dédié (bouton 🧠) permet de **consulter cette mémoire** et d'oublier une entrée erronée.
- **Mode démo (sans clé API)** : tant qu'aucune clé Gemini n'est configurée, l'application répond avec un message simulé — l'interface reste utilisable pour le développement.

---

## Prérequis

- [Node.js](https://nodejs.org/) (LTS recommandé)
- [Ionic CLI](https://ionicframework.com/docs/cli) (optionnel) : `npm install -g @ionic/cli`

## Installation

```bash
npm install
```

## Configuration de la clé API

La clé API Gemini n'est **jamais** versionnée. Le dépôt fournit un modèle :

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
```

Renseigne ensuite ta clé dans `src/environments/environment.ts` :

| Variable           | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `GEMINI_API_KEY`   | Clé API obtenue sur [Google AI Studio](https://aistudio.google.com) |
| `GEMINI_MODEL`     | Modèle utilisé (ex. `gemini-3.1-flash-lite`, palier gratuit)       |
| `GEMINI_API_URL`   | Racine de l'API Gemini                                             |

> Sans clé, l'application fonctionne en **mode démo** (réponses simulées).

## Lancer l'application

```bash
npm start          # serveur de développement (http://localhost:4200)
npm run build      # build de production (dans www/)
npm test           # tests unitaires (Karma + Jasmine)
npm run lint       # analyse statique (ESLint)
```

---

## Architecture

Sous `src/app/` :

- **`pages/`** — les écrans : `characters` (liste), `character-form` (création/édition), `chat` (conversation), `memory` (mémoire d'une conversation), `personas` (liste), `persona-form` (création/édition).
- **`components/`** — composants réutilisables : `character-card`, `message-bubble`.
- **`services/`** — la logique applicative, avec une séparation nette des responsabilités IA :
  - `GeminiService` — uniquement l'appel HTTP brut au modèle.
  - `ChatService` — orchestration (assemble le prompt système via l'util `buildSystemPrompt`, construit l'historique, persiste les messages).
  - `CharacterService` — gestion des personnages.
  - `PersonaService` — gestion des personas incarnés par l'utilisateur.
  - `DatabaseService` — interface dev-friendly (tables/lignes) pour le stockage local.
  - `StorageService` — couche de stockage bas niveau (Ionic Storage).
  - `MessageService` — retours UI (toasts, alertes).
  - `VersionHandlerService` — montées de version du format de la bdd (migrations exécutées au démarrage via `provideAppInitializer`).
- **`utils/`** — fonctions utilitaires pures.

Changer de modèle ou de fournisseur d'IA ne doit toucher que `GeminiService` et l'`environment`.

Les conventions de code détaillées sont décrites dans [`CLAUDE.md`](./CLAUDE.md).
