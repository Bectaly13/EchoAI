# TODO — Feuille de route

Fonctionnalités à venir, **reformulées et ordonnées par priorité**. La référence entre parenthèses (ex. « demande initiale #4 ») renvoie au numéro d'origine de la demande, pour traçabilité — l'ordre ci-dessous ne suit **pas** cette numérotation mais la priorité (rapport valeur/effort + dépendances).

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

---

## Phase 0 — Refactors transverses (prérequis)

Ces chantiers ne sont pas des fonctionnalités visibles mais conditionnent presque toutes les suivantes. À faire **avant** la Phase 1 pour éviter de tout réécrire ensuite.

### 0.1 — Extraire un `PromptBuilder` 🟢 ✅ Fait
Aujourd'hui, `ChatService.send` passe directement `character.systemPrompt` à Gemini. Or le prompt système va devoir agréger de plus en plus de sources : personnalité + champs structurés (#5), salutation (#2), consigne de narration (#3), persona actif (#1), mémoire permanente (#4).

- **Fait** : créé `src/app/utils/build-system-prompt.ts` (fonction pure `buildSystemPrompt`), qui prend un objet `{ character }` (extensible : persona, mémoire, options…) et retourne le prompt système assemblé par blocs nettement séparés (titres en majuscules : `PERSONNAGE`, et à venir `UTILISATEUR (PERSONA)`, `MÉMOIRE PERMANENTE`, `CONSIGNES DE FORMAT`…).
- `ChatService.send` n'appelle plus que ce builder. Chaque fonctionnalité suivante ajoutera son bloc sans toucher au reste. Effet de bord positif : le **nom** du personnage est désormais transmis à l'IA (ce n'était pas le cas avant).

### 0.2 — Identifiant stable sur `ChatMessage` 🟢 ✅ Fait
`ChatMessage` n'a qu'un `at` (timestamp), insuffisant pour cibler un message de façon fiable (collisions possibles, nécessaire pour #8 et le rattachement mémoire de #4).

- **Fait** : ajouté `id: string` (`crypto.randomUUID()`) à `ChatMessage`, généré à la création de chaque message (y compris le message optimiste de `chat.page`). Migration douce : `ChatService.getMessages` attribue un `id` aux anciens messages qui n'en ont pas et persiste la conversation si besoin. Le template de chat track désormais par `message.id`.

### 0.3 — Gestionnaire de versions de la bdd 🟢 ✅ Fait
Centralise les montées de version du format de la bdd, au lieu d'éparpiller des correctifs de migration. Indispensable avant les changements de format à venir (table `personas`, champs enrichis, mémoire…).

- **Fait** : ajouté `VersionHandlerService` (repris du pattern du projet « Les-recettes-de-Titou », adapté aux API `DatabaseService`/`StorageService` d'ici). `init()` pose la version courante (`appVersion = 1`) au premier lancement en matérialisant la db **sans écraser** les données existantes ; ne fait rien si déjà à jour ; structure prête à enchaîner les migrations `updateToVx()` puis à enregistrer la nouvelle version.
- **Fait** : `init()` est câblé via `provideAppInitializer` dans `main.ts` → les migrations s'exécutent **avant** le démarrage de l'app, donc avant toute lecture de la bdd par une page (pas de course).
- **À l'avenir** : chaque évolution de format = incrémenter `appVersion` + ajouter la migration `updateToVx()` correspondante.

---

## Phase 1 — Immersion de base (gains rapides)

### 1 — Salutation du personnage *(demande initiale #2)* 🟢 ✅ Fait
Le **premier message** d'une conversation est toujours celui du personnage IA, défini à la création, pour planter le décor.

- **Fait — Données** : ajouté `greeting: string` à `Character` ; `create()` prend désormais la salutation en paramètre.
- **Fait — Formulaire** : champ « Message d'accueil » (textarea) dans `character-form`, chargé en édition (`?? ""` pour les anciens personnages).
- **Fait — Chat** : la salutation est semée comme premier message `{ role: "model", text: greeting }` à la création de la conversation, via `persistNewConversation` (factorisée, utilisée par `getMessages` et `getOrCreateConversation`). Elle s'affiche dès l'ouverture du chat (sans qu'on ait à écrire) et fait partie de l'historique envoyé à Gemini (l'enchaînement `[model(greeting), user(…)]` alterne correctement).
- **Choix retenus** :
  - Personnages sans `greeting` → champ optionnel, aucune conversation créée tant qu'on n'écrit pas (lazy preservé).
  - La salutation ne devra **pas** être regénérée par #8 (message « ancré ») — à prendre en compte lors de l'implémentation du point 3.

### 2 — Narration en astérisques *(demande initiale #3)* 🟢 ✅ Fait
L'IA peut utiliser `*…*` pour la narration/les actions ; le client les met en forme (italique + grisé).

- **Fait — Côté prompt** : bloc `CONSIGNES DE FORMAT` ajouté par `buildSystemPrompt` (0.1) : encadrer actions/narration entre astérisques, laisser les paroles sans.
- **Fait — Côté rendu** : util pur `formatNarration(text)` qui découpe le texte en segments `{ text, isNarration }` via un `split` sur groupe capturant (`/(\*[^*]+\*)/`). Le template de `message-bubble` rend les segments avec `@for` + `@if` (spans `message-bubble-narration` / `message-bubble-speech`), **sans `innerHTML`** (sécurité). S'applique aussi bien aux messages IA qu'utilisateur.
- **Fait — Style** : `.message-bubble-narration` → `italic` + `var(--app-narration)` (+ `var(--app-narration-on-accent)` sur les bulles utilisateur), nouvelles variables dans `theme/variables.scss`.
- **Choix retenus** : astérisque non appariée laissée en texte brut ; `matchAll` écarté (lib < ES2020) au profit de `split` ; pas de moteur Markdown complet (mini-format maison). Cas limites vérifiés (espaces préservés, `*` isolée, `**`).

### 3 — Régénérer / supprimer un message *(demande initiale #8)* 🟡
UX d'édition de la conversation.

- **Régénérer** : `ChatService.regenerate(characterId)` retire le dernier message `model` et relance `generate` avec l'historique jusqu'au dernier message `user`. Bouton sur le dernier message IA dans `chat`.
- **Supprimer** : `ChatService.deleteFrom(characterId, messageId)` tronque le tableau à partir du message ciblé (supprime aussi tous les suivants pour ne pas « trouer » l'historique). Déclencheur UI : action sur la bulle (appui long ou bouton).
- **Dépendances** : nécessite l'`id` de message (0.2).
- **Limites** : quand la **mémoire permanente** (#4) existera, régénérer/supprimer devra aussi **annuler les écritures mémoire** issues des tours supprimés → prévoir de rattacher chaque entrée mémoire au `messageId` qui l'a produite (voir Phase 3).

### 3b — Passer son tour (faire reparler l'IA) 🟡
Un bouton qui permet à l'utilisateur de **passer son tour** : sans écrire de message, il demande au personnage IA de produire un message de plus de lui-même (faire avancer la scène, enchaîner, relancer…).

- **UI** : bouton dans le pied de page du `chat` (ex. « Passer mon tour » / « Laisser parler … »), à côté de « Envoyer ».
- **Chat / service** : `ChatService.skipTurn(characterId)` (nom à confirmer) génère un nouveau message `model` à partir de l'historique courant, **sans** ajouter de message `user`, puis l'ajoute et le persiste.
- **Limite à gérer — tour `user` final attendu** : après un « passage », le dernier message de l'historique est `model` (la salutation, ou la réponse précédente). Or `generateContent` attend que le dernier tour soit `user`. Solution : injecter dans les `contents` un tour `user` **transitoire et non persisté** (ex. « *[L'utilisateur passe son tour. Continue toi-même la scène.]* ») pour amorcer la réponse, sans polluer l'historique visible/stocké.
- **Points d'attention** : couvrir aussi le chemin mock (sans clé API) ; gérer le `sending` (désactiver le bouton pendant l'attente) ; cohérent avec la régénération (#3) qui réutilisera la même mécanique de génération.

---

## Phase 2 — Rôle & richesse des personnages

### 4 — Personas (qui est l'utilisateur) *(demande initiale #1)* 🟡
L'utilisateur définit plusieurs personas (nom/surnoms, histoire, pouvoirs…) et choisit, dans une conversation, lequel il incarne (ou aucun). Ces infos sont transmises à Gemini.

- **Données** : nouvelle table `personas` (cf. `DatabaseService`). Modèle `Persona` calqué sur un personnage : `{ id, name, description / champs libres, createdAt }`.
- **Service** : `PersonaService` (CRUD) sur le modèle de `CharacterService`.
- **Pages** : `personas` (liste) + `persona-form` (création/édition), calquées sur les pages personnages. Routes + entrée de navigation à ajouter.
- **Chat** : sélecteur de persona actif ; on persiste le choix sur la conversation (`personaId?` sur `Conversation`). Le `PromptBuilder` ajoute un bloc `UTILISATEUR (PERSONA)`.
- **Limites** : « aucun persona » est un cas valide (bloc omis). Cohérence si un persona est supprimé alors qu'il est référencé par une conversation → fallback « aucun ».

### 5 — Champs de création enrichis *(demande initiale #5)* 🟡
Remplacer le `systemPrompt` libre unique par des champs structurés : relation initiale avec l'utilisateur, goûts/préférences, connaissance d'autres personnages, apparence, etc.

- **Données** : enrichir `Character` avec un objet `profile` typé, tous champs **optionnels** : `initialRelationship`, `likes`, `dislikes`, `knownCharacters`, `appearance`, … Conserver un champ libre `additionalInstructions` (ex-`systemPrompt`) pour le surplus.
- **Formulaire** : `character-form` éclaté en sections.
- **Prompt** : le `PromptBuilder` compose ces champs en bloc `PERSONNAGE` lisible.
- **Limites / migration** : champs optionnels pour ne pas casser les personnages existants ; prévoir le mapping de l'ancien `systemPrompt` → `additionalInstructions`.

---

## Phase 3 — Fidélité narrative avancée

### 6 — Mémoire permanente / contexte persistant *(demande initiale #4)* 🔴
Conserver d'un message à l'autre des informations durables (lieu de l'action, relation utilisateur/personnage, instructions à conserver, hauts-faits…). **L'IA décide elle-même** ce qui doit entrer en mémoire (changement de lieu, étape de relation, jalon d'histoire…).

- **Données** : ajouter `memory` à `Conversation`, sous forme d'entrées catégorisées : `{ id, category: "location" | "relationship" | "milestone" | "instruction", value, at, sourceMessageId }`. (`sourceMessageId` permet le rollback de #8.)
- **Détection par l'IA — deux approches** :
  - **(a) Sortie structurée en un appel** *(recommandé)* : via `responseSchema` / function calling de Gemini, demander un objet `{ reply, memoryUpdates?: [...] }`. Un seul appel, mais nécessite de bien séparer narration libre et données structurées.
  - **(b) Deuxième passe dédiée** : après la réponse, un appel « extrais les faits durables à mémoriser ». Plus simple/fiable, mais **double la consommation de quota** (voir #9).
- **Injection** : le `PromptBuilder` ajoute un bloc `MÉMOIRE PERMANENTE` à chaque tour.
- **Limites / points d'attention** :
  - **Quota** (palier gratuit) : préférer l'approche (a) pour ne pas doubler les requêtes.
  - **Croissance** : plafonner/fusionner/résumer la mémoire pour ne pas exploser le budget de tokens (dédup par catégorie, écrasement du lieu courant, liste de jalons bornée).
  - **Fiabilité** : l'IA peut sur- ou sous-mémoriser → prévoir une page de visualisation/édition manuelle de la mémoire (utile aussi en debug).
  - **Rollback** : régénérer/supprimer (#8) doit retirer les entrées dont `sourceMessageId` pointe vers un tour effacé.

---

## Phase 4 — Assistance IA & images

### 7 — Création de personnage assistée par IA *(demande initiale #6)* 🔴
- **(a) Brouillon → fiche structurée** : à partir d'un prompt brouillon, générer une fiche bien formulée qui **remplit les champs de #5**. Méthode : appel Gemini avec `responseSchema` correspondant au `profile` (#5) ; on pré-remplit le formulaire avec le résultat (éditable). **Dépend de #5.**
- **(b) Image de profil générée** : à partir d'un prompt, générer une photo de profil.
  - **Méthode** : `GeminiService.generateImage(prompt)` ; nouveau modèle image dans `environment` (`GEMINI_IMAGE_MODEL`). Stocker le résultat (data URL / base64) dans `Character.avatarImage`.
  - **Limites** : disponibilité d'un modèle image (et sur palier gratuit ?) à confirmer ; quota dédié ; **poids du stockage** local (base64 volumineux en IndexedDB) ; politique de contenu du modèle. La pastille de couleur actuelle reste le fallback si pas d'image.

### 8 — Génération d'image dans le chat *(demande initiale #7)* 🔴
Générer une image illustrant l'état actuel de la conversation, à partir de **(a)** la photo de profil du personnage (devient alors **obligatoire**) et **(b)** le contexte courant.

- **Dépendances** : nécessite #7(b) (image de profil) et idéalement #6 (mémoire = contexte).
- **Données** : `ChatMessage` doit pouvoir porter une image → ajouter `imageData?` ; le `message-bubble` affiche l'image. Déclencheur : bouton « Illustrer la scène ».
- **Méthode** : construire le prompt image à partir de la mémoire + des derniers messages, en fournissant la photo de profil comme **image de référence** (image-to-image) pour garder l'apparence du personnage.
- **Limites** : quota/coût image ; latence ; **cohérence d'apparence** entre images (dépend du support image-de-référence du modèle) ; poids cumulé du stockage (plusieurs images par convo).

---

## Phase 5 — Robustesse & debug

### 9 — Repli des modèles + suivi d'utilisation *(demande initiale #9)* 🟡
Afficher dans l'app l'état d'utilisation des modèles (≥1 modèle texte + ses remplaçants si épuisé, 1 modèle image).

- **Prérequis utile — chaîne de repli** : `GeminiService` devrait accepter une **liste** de modèles (texte) et basculer sur le suivant en cas de `429 RESOURCE_EXHAUSTED`. Cette infra sert directement le suivi ci-dessous (`environment` : `GEMINI_MODELS` au lieu d'un seul).
- **Ce qui est faisable** :
  - **Compteurs locaux** : table `usage` comptant les requêtes par modèle et par jour, affichée dans une page debug.
  - **Tokens** : lire `usageMetadata` (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`) renvoyé dans chaque réponse et les cumuler.
  - **État « épuisé »** : sur `429`, marquer le modèle épuisé pour la journée et afficher le basculement vers le remplaçant (lire `Retry-After` / détails d'erreur si présents).
- **⚠️ Limite forte de l'API** : l'API Gemini **n'expose pas** de point d'accès donnant le quota restant du palier gratuit (ex. « X/500 requêtes restantes aujourd'hui »). Cette info n'est visible que dans Google AI Studio / la console Cloud. Le suivi in-app sera donc **estimé** (compteurs locaux + détection des `429`), pas une lecture officielle du quota — à présenter comme tel à l'utilisateur.

---

## Récapitulatif de l'ordre

| Ordre | Fonctionnalité | Origine | Effort | État |
| ----- | -------------- | ------- | ------ | ---- |
| 0.1 | Refactor `PromptBuilder` | — | 🟢 | ✅ Fait |
| 0.2 | `id` stable sur les messages | — | 🟢 | ✅ Fait |
| 0.3 | Gestionnaire de versions de la bdd | — | 🟢 | ✅ Fait |
| 1 | Salutation du personnage | #2 | 🟢 | ✅ Fait |
| 2 | Narration en astérisques | #3 | 🟢 | ✅ Fait |
| 3 | Régénérer / supprimer un message | #8 | 🟡 | À faire |
| 3b | Passer son tour (faire reparler l'IA) | — | 🟡 | À faire |
| 4 | Personas | #1 | 🟡 | À faire |
| 5 | Champs de création enrichis | #5 | 🟡 | À faire |
| 6 | Mémoire permanente / contexte | #4 | 🔴 | À faire |
| 7 | Création assistée par IA (fiche + image) | #6 | 🔴 | À faire |
| 8 | Génération d'image dans le chat | #7 | 🔴 | À faire |
| 9 | Repli des modèles + suivi d'utilisation | #9 | 🟡 | À faire |
