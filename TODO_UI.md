# TODO_UI — Restructuration UI & navigation

Première volée **UI/UX** : restructuration des pages, de la navigation et des composants transverses, en s'inspirant du projet *Les-recettes-de-Titou*. Cible : **mobile uniquement**. Ce n'est pas encore du style/finition (palettes, animations) — c'est de la **réorganisation** : l'essentiel du code existe déjà et fonctionne, il faut le déplacer et le rebrancher. Le style fin viendra dans une volée ultérieure.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé (surtout volume de rebranchement).

Conventions confirmées pour cette volée :
- `<ion-header>` est autorisé **uniquement** pour envelopper `app-header` (exception déjà prévue dans `CLAUDE.md`). `ion-icon` est autorisé (icônes header/navbar, via `addIcons` en mode standalone).
- 3 thèmes : **Défaut** (palette façon Discord : bleu + noir, thème par défaut), **Clair**, **Sombre**. Palettes à affiner plus tard.

---

## 1 — Fondations de thème : ThemeService + variables par thème 🟡 ✅ Fait
Mettre en place la gestion de thèmes (calquée sur le projet de référence) et restructurer `variables.scss`.

- **ThemeService** : `type Theme = "Défaut" | "Clair" | "Sombre"`, mapping vers des classes body (`theme-default`, `theme-light`, `theme-dark`). Méthodes `initTheme` / `applyTheme(theme)` / `getTheme` / `getThemes`, persistance via `StorageService` (clé `theme`). Défaut : « Défaut ».
- **`variables.scss`** : passer du `:root` unique actuel à **une classe par thème** définissant les `--app-*` existants + de nouvelles variables transverses : `--header-background/-border/-text/-back-background`, `--navbar-background/-border/-icon/-icon-active`, et `--safe-top` / `--safe-bottom` (= `env(safe-area-inset-*)`).
- **Limite** : les palettes (notamment « Défaut » façon Discord) sont posées en première version et seront affinées à la phase style.

## 2 — Blocage en mode portrait (Capacitor) 🟢
Bloquer l'application en orientation portrait, comme le projet de référence.

- **Méthode** : ajouter la dépendance `@capacitor/screen-orientation` ; appeler `ScreenOrientation.lock({ orientation: 'portrait' })` au chargement de `app.component.ts`.
- **Limite** : effet réel sur appareil/emulateur natif ; sans effet en simple navigateur desktop (cible = mobile).

## 3 — Composants transverses Header et Navbar 🟡
Créer deux composants réutilisables (calqués sur la référence).

- **`HeaderComponent`** : `input` `title` (requis) et `showBack` (bool) ; `output` `back`. Rend un en-tête avec flèche de retour optionnelle, titre, et logo (`assets/icon/favicon.png`). `ion-icon` + `addIcons`.
- **`NavbarComponent`** : barre fixe en bas (safe-area), 5 boutons `routerLink` + `routerLinkActive="active"` vers les 5 onglets, `ion-icon` par onglet. Icônes proposées : Personnages `people`, Conversations `chatbubbles`, Personas `person-circle`, Tokens `server`, Paramètres `settings`.
- **Règle d'usage** : les **pages principales** (5 onglets) affichent header **+ navbar** ; les **sous-pages** (formulaires, chat, mémoire) affichent header avec `showBack` **sans** navbar.

## 4 — Page Welcome / splash + reroutage de l'initialisation 🟡
Écran d'accueil au lancement, puis redirection.

- **Méthode** : page `welcome` (route `''` → `welcome`) affichant le splash (logo). Dans `ionViewWillEnter` : `theme.initTheme()`, `version.init()`, puis `personaService.ensureDefault()`, un court délai (≈ 2 s), et redirection vers `characters`. Retirer le `provideAppInitializer` de `main.ts` (l'init se fait désormais dans le welcome, comme la référence).
- **Limite** : l'init n'est garantie que via le flux normal (lancement → welcome). Un accès direct à une sous-route (deep link / reload dev) ne rejouerait pas l'init — acceptable pour une app mobile qui démarre toujours sur welcome ; à garder en tête.

## 5 — Architecture de navigation (routes + ossature header/navbar) 🔴
Mettre en place le squelette de navigation à 5 onglets et rebrancher l'ossature sur toutes les pages.

- **Routes** : `''`→`welcome` ; onglets `characters`, `conversations`, `personas`, `tokens`, `settings` ; sous-pages `character-form(/:id)`, `chat/:id`, `memory/:id`, `persona-form(/:id)`.
- **Rebranchement** : remplacer les en-têtes custom actuels de chaque page par `<ion-header><app-header …></app-header></ion-header>` ; ajouter `<app-navbar>` sur les 5 onglets ; `showBack` + `(back)` sur les sous-pages (retour cohérent). Prévoir le padding bas des pages à onglets pour ne pas passer sous la navbar fixe.
- **Volume** : c'est le gros du chantier (mécanique). Les points 6–11 détaillent les spécificités par page.

## 6 — Page Personnages 🟢
- **Carte** : nom + **aperçu de la description sur une ligne max** (ellipsis) — la « description » est la personnalité (`systemPrompt`). Actions inchangées (créer, modifier, supprimer, ouvrir/créer la conversation).
- **Ossature** : header (« Personnages ») + navbar. Les boutons actuels de l'en-tête (Personas, Tokens, + Nouveau) sont repensés : navigation principale via la navbar ; « + Nouveau » conservé (header ou bouton dédié).

## 7 — Page Conversations (nouvelle) 🟡
- **Liste** : toutes les conversations existantes, **triées par date récente** (récence = `at` du dernier message). Chaque ligne : **nom du personnage** + **aperçu du dernier message sur une ligne max**.
- **Actions** : tap → ouvre le `chat`. **Suppression** d'une conversation (efface messages + mémoire, **conserve** le personnage) avec confirmation — méthode : `ChatService.deleteConversation(characterId)` (supprime la ligne `conversations`).
- **Ossature** : header (« Conversations ») + navbar.
- **Limite** : un message-image (illustration) a un texte vide → l'aperçu affichera un libellé de repli (ex. « [image] »).

## 8 — Page Personas 🟢
- **Ossature** : header (« Personas ») + navbar (remplace l'en-tête custom).
- **Édition du persona par défaut** : éditable via `persona-form`, mais le champ **description est masqué** quand `isDefault` (le persona par défaut n'a pas de description — seul le nom est modifiable). Suppression déjà bloquée (tag « par défaut »).

## 9 — Page Tokens (ex-Usage) 🟢
- **Renommage** : route `usage` → `tokens`, onglet/titre « Tokens ». (Le service `UsageService` et la table `usage` restent inchangés en interne.)
- **Ossature** : header (« Tokens ») + navbar. Contenu inchangé (suivi par modèle, « X / RPD », tokens, avertissement).

## 10 — Page Paramètres (nouvelle) 🟢
- **Contenu** : sélecteur de **thème** (boutons par thème via `ThemeService.getThemes()`, application immédiate) et affichage de la **version** (`VersionHandlerService.appVersionDisplay`).
- **Ossature** : header (« Paramètres ») + navbar.

## 11 — Sous-pages : header avec retour 🟡
Rebrancher les pages non-onglets sur `app-header` (`showBack`), **sans** navbar : `character-form`, `persona-form`, `chat`, `memory`. Conserver les actions spécifiques (ex. dans le chat : reset ↺, mémoire 🧠, persona ; pied de saisie). Le bouton retour du header remplace les boutons « ← » custom actuels.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Fondations de thème (ThemeService + variables par thème) | 🟡 | ✅ Fait |
| 2 | Blocage portrait (Capacitor ScreenOrientation) | 🟢 | À faire |
| 3 | Composants Header + Navbar | 🟡 | À faire |
| 4 | Page Welcome / splash + reroutage init | 🟡 | À faire |
| 5 | Architecture de navigation (routes + ossature) | 🔴 | À faire |
| 6 | Page Personnages (aperçu description 1 ligne) | 🟢 | À faire |
| 7 | Page Conversations (nouvelle, tri récent, suppression) | 🟡 | À faire |
| 8 | Page Personas (édition défaut sans description) | 🟢 | À faire |
| 9 | Page Tokens (ex-Usage, renommage) | 🟢 | À faire |
| 10 | Page Paramètres (nouvelle, thème + version) | 🟢 | À faire |
| 11 | Sous-pages : header avec retour (sans navbar) | 🟡 | À faire |
