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

### 2b — Convention de dialogue (nom + guillemets) 🟢 ✅ Fait
Le personnage IA préfixe chaque réplique par le nom de celui qui parle et met les paroles entre guillemets, p. ex. `Alice : "Bonjour"` / `Bob : "Salut"`. Utile quand l'IA fait parler plusieurs personnages dans une même scène.

- **Fait — Côté prompt** : ligne ajoutée au bloc `CONSIGNES DE FORMAT` de `buildSystemPrompt`, avec l'exemple, et précision que la narration en astérisques reste en dehors des guillemets.
- **Choix retenus** : convention purement côté prompt — le client affiche `Nom : "…"` tel quel (rien à transformer, contrairement aux astérisques). Une mise en forme du nom (ex. gras) côté client reste possible plus tard si besoin.

### 3 — Régénérer / supprimer un message *(demande initiale #8)* 🟡 ✅ Fait
UX d'édition de la conversation.

- **Fait — Régénérer** : `ChatService.regenerate(characterId)` retire le dernier message `model` et relance la génération sur l'historique restant. Bouton `↻` affiché **uniquement sur le dernier message de l'IA**, et jamais sur la salutation « ancrée » (garde : dernier message `model` **et** au moins un message `user` dans l'historique).
- **Fait — Supprimer** : `ChatService.deleteFrom(characterId, messageId)` tronque le tableau à partir du message ciblé (`splice`), supprimant aussi tous les suivants. Bouton `🗑` sur chaque bulle, avec **confirmation** (`AlertController`, comme `characters.page`).
- **Fait — UI** : `message-bubble` reçoit `canRegenerate` (input) et émet `regenerate` / `remove` (outputs) ; `chat.page` calcule `canRegenerate(message)` et orchestre, en réutilisant l'indicateur `sending`.
- **Cas limites vérifiés** (Node) : salutation non régénérable, troncature exacte, id inconnu sans effet.
- **À garder pour plus tard** : quand la **mémoire permanente** (#4) existera, régénérer/supprimer devra aussi **annuler les écritures mémoire** des tours supprimés → rattacher chaque entrée mémoire au `messageId` qui l'a produite (voir Phase 3).

### 3b — Passer son tour (faire reparler l'IA) 🟡 ✅ Fait
Un bouton qui permet à l'utilisateur de **passer son tour** : sans écrire de message, il demande au personnage IA de produire un message de plus de lui-même (faire avancer la scène, enchaîner, relancer…).

- **Fait — UI** : bouton `⏭` (« Passer mon tour ») dans le pied de page du `chat`, à gauche du champ de saisie, désactivé pendant l'attente (`sending`).
- **Fait — Chat / service** : `ChatService.skipTurn(characterId)` génère un nouveau message `model` à partir de l'historique courant, **sans** ajouter de message `user`, puis l'ajoute et le persiste.
- **Fait — Limite tour `user` final** : `generateContinuation` ajoute aux `contents` un tour `user` **transitoire et non persisté** (constante `CONTINUATION_PROMPT`) pour amorcer la réponse, sans polluer l'historique stocké.
- **Fait — Chemin mock** : `mockContinuation()` dédié quand aucune clé API n'est configurée.

---

## Phase 2 — Rôle & richesse des personnages

### 4 — Personas (qui est l'utilisateur) *(demande initiale #1)* 🟡 ✅ Fait
L'utilisateur définit plusieurs personas (nom/surnoms, histoire, pouvoirs…) et choisit, dans une conversation, lequel il incarne (ou aucun). Ces infos sont transmises à Gemini.

- **Fait (commit A — CRUD)** :
  - **Données** : table `personas` ajoutée à la structure par défaut de `DatabaseService` ; migration `updateToV2()` du `VersionHandlerService` (bump `appVersion` 1 → 2). Modèle `Persona` : `{ id, name, description, avatarColor, createdAt }` (description libre, comme le `systemPrompt` d'un personnage).
  - **Service** : `PersonaService` (CRUD) calqué sur `CharacterService`.
  - **Pages** : `personas` (liste, avec pastille/édition/suppression confirmée) + `persona-form` (création/édition). Routes ajoutées + bouton « Personas » dans le header de la page personnages.
- **Fait (commit B — intégration chat)** :
  - **Données** : `personaId?` ajouté à `Conversation`. `ChatService.getActivePersonaId` / `setActivePersona` (get/set + persistance), `personaFor(conversation)` résout le persona (et retombe sur « aucun » si l'id ne pointe plus sur rien → suppression gérée).
  - **Prompt** : `buildSystemPrompt` accepte `persona?` et ajoute un bloc `UTILISATEUR (PERSONA)` ; branché sur les trois points de génération (`send`, `regenerate`, `skipTurn`).
  - **Chat** : bouton dans le header affichant le persona actif (ou « Aucun persona »), qui ouvre un choix radio (`AlertController`) ; « aucun persona » est un choix valide.
- **Limites** : « aucun persona » est un cas valide (bloc omis). Cohérence si un persona est supprimé alors qu'il est référencé par une conversation → fallback « aucun ».

### 5 — Champs de création enrichis *(demande initiale #5)* 🟡 ✅ Fait
Compléter la personnalité libre par des champs structurés : apparence, relation initiale avec l'utilisateur, goûts/préférences, ce qu'il n'aime pas, autres personnages qu'il connaît.

- **Fait — Données** : `Character` enrichi de 5 champs **optionnels** (`appearance`, `initialRelationship`, `likes`, `dislikes`, `knownCharacters`). Type `CharacterDraft` (champs éditables) ; `create()` refactoré pour prendre un objet `draft` (au lieu de paramètres positionnels).
- **Fait — Formulaire** : `character-form` éclaté en sections (« Détails (optionnels) »), chaque champ chargé en édition (`?? ""`).
- **Fait — Prompt** : `buildCharacterBlock` compose la personnalité + les champs renseignés en bloc `PERSONNAGE` lisible (helper `appendField`, ignore les champs vides).
- **Écart assumé vs plan initial** : on **garde `systemPrompt`** (libellé « Personnalité ») comme description principale au lieu de le renommer `additionalInstructions`. Conséquence : **aucune migration de bdd** (les nouveaux champs optionnels n'impactent pas les personnages existants, gérés par `?? ""`).

---

## Phase 3 — Fidélité narrative avancée

### 6 — Mémoire permanente / contexte persistant *(demande initiale #4)* 🔴 ✅ Fait (moteur)
Conserver d'un message à l'autre des informations durables (lieu de l'action, relation utilisateur/personnage, instructions à conserver, hauts-faits…). **L'IA décide elle-même** ce qui doit entrer en mémoire (changement de lieu, étape de relation, jalon d'histoire…).

- **Fait — Données** : `memory?: MemoryEntry[]` sur `Conversation`, entrées catégorisées `{ id, category: "location" | "relationship" | "milestone" | "instruction", value, at, sourceMessageId }`. Persistées via `saveConversation`.
- **Fait — Détection (approche balisée, 1 appel)** : l'IA ajoute en fin de réponse un bloc `[[MEMORY]] catégorie: valeur … [[/MEMORY]]` (consigne dans `buildSystemPrompt`). Util pur `parseMemory` qui retire le bloc du texte affiché et en extrait les mises à jour. Choix d'une **convention textuelle** plutôt que `responseSchema` JSON : 1 seul appel (pas de surcoût quota), réponse narrative préservée, dégradation propre si mal formé, `GeminiService` inchangé.
- **Fait — Fusion / croissance** : catégories à valeur unique (`location`, `relationship`) → la nouvelle valeur remplace l'ancienne ; catégories à valeurs multiples (`milestone`, `instruction`) → ajout borné à `MAX_LIST_ENTRIES` (30) par `capMemory`.
- **Fait — Injection** : `buildSystemPrompt` ajoute un bloc `MÉMOIRE PERMANENTE` (groupé par catégorie) à chaque tour, plus un bloc `CONSIGNES DE MÉMOIRE` expliquant la convention d'écriture.
- **Fait — Rollback** : `regenerate` oublie la mémoire produite par le message régénéré (`forgetMemoryFrom`) ; `deleteFrom` retire les entrées dont `sourceMessageId` n'est plus dans l'historique. Cas vérifiés (Node).
- **Suite** : écran de visualisation/édition de la mémoire → fait en **6b**.

### 6b — Écran de visualisation de la mémoire 🟢 ✅ Fait
Depuis une conversation, voir l'état de la mémoire permanente (et corriger si l'IA a mal mémorisé).

- **Fait — Service** : `ChatService.getMemory` (lecture), `deleteMemoryEntry` (oublier une entrée), `clearMemory` (tout vider).
- **Fait — Page** : `memory/:id` (`MemoryPage`), accessible via un bouton `🧠` dans le header du chat. Affiche la mémoire **groupée par catégorie** (Lieu actuel, Relation, Jalons, Consignes), avec suppression d'une entrée et « Tout oublier » (les deux avec confirmation). État vide explicite.

---

## Phase 4 — Assistance IA & images

### 7 — Création de personnage assistée par IA *(demande initiale #6)* 🟢 ✅ Fait
- **(a) Brouillon → fiche structurée** ✅ **Fait** : à partir d'un prompt brouillon, générer une fiche bien formulée qui **remplit les champs de #5**.
  - **Fait — Service bas niveau** : `GeminiService.generateStructured(prompt, responseSchema)` (appel HTTP brut avec `generationConfig.responseMimeType = "application/json"` + `responseSchema`), renvoie l'objet désérialisé (ou `null` si réponse inexploitable). `GeminiService` reste cantonné à l'appel brut.
  - **Fait — Orchestration** : util pur `build-draft-prompt.ts` (`buildDraftPrompt(brief)` + `CHARACTER_DRAFT_SCHEMA` calqué sur `CharacterDraft`). `CharacterService.draftFromBrief(brief)` assemble le prompt, appelle Gemini, normalise le résultat en `CharacterDraft` (champs manquants → `""`), avec **chemin mock** sans clé API.
  - **Fait — UI** : section « Brouillon (assistance IA) » en tête de `character-form` (textarea + bouton « Générer la fiche », désactivé pendant l'attente / si vide). Le résultat **pré-remplit** tous les champs, qui restent **éditables**. Disponible en création comme en édition.
- **(b) Image de profil générée** ✅ **Fait** : à partir des champs de la fiche, générer une photo de profil.
  - **Fait — Service bas niveau** : `GeminiService.generateImage(prompt)` appelle l'endpoint `:predict` d'Imagen et renvoie l'image en **data URL base64** (`predictions[0].bytesBase64Encoded`). **Chaîne de repli** : `environment.GEMINI_IMAGE_MODELS` (liste ordonnée du plus performant au moins performant) ; on bascule sur le modèle suivant en cas de `429` (quota épuisé), on remonte toute autre erreur.
  - **Fait — Modèles** : palier gratuit → seuls les **Imagen 4** (Fast/Generate/Ultra, 25 img/jour) sont accessibles ; ordre retenu Ultra → Generate → Fast.
  - **Fait — Orchestration** : util pur `build-image-prompt.ts` (`buildImagePrompt({ name, appearance, systemPrompt })`, portrait/avatar). `CharacterService.generateAvatar(fields)` ; **pas de mode démo** (lève `no-api-key` sans clé). Image stockée dans `Character.avatarImage` (champ optionnel, **pas de migration** — même choix qu'au point 5).
  - **Fait — UI** : section « Photo de profil » dans `character-form` (aperçu + « Générer / Régénérer / Retirer »). Avatar affiché dans la liste (`character-card`) et l'en-tête du chat ; **fallback** sur la pastille de couleur si pas d'image.
  - **Limite assumée** : quota 25/jour ; poids du base64 en IndexedDB ; politique de contenu du modèle.

### 8 — Génération d'image dans le chat *(demande initiale #7)* 🔴 ✅ Fait
Générer une image illustrant l'état actuel de la conversation, à partir du contexte courant.

- **Fait — Données** : `ChatMessage.imageData?` (data URL base64). Un message-image a un `text` vide et porte `imageData` ; `build-gemini-contents` **exclut** ces messages (on ne renvoie pas de base64 au modèle texte).
- **Fait — Service** : `ChatService.illustrateScene(characterId)` construit le prompt image (util pur `build-scene-image-prompt.ts` : apparence du personnage + lieu courant tiré de la mémoire + derniers messages), appelle `GeminiService.generateImage` (réutilise la chaîne de repli Imagen de 7(b)), ajoute le message-image et persiste. **Pas de mode démo** (lève `no-api-key` sans clé).
- **Fait — UI** : bouton « Illustrer la scène » (🖼) dans le pied de page du chat. `message-bubble` affiche l'image (et masque le paragraphe de texte vide). Régénération désactivée sur les messages-images ; suppression possible (via la bulle, comme les autres messages).
- **⚠️ Écart assumé vs plan initial (palier gratuit)** : les seuls modèles faisant de l'**image→image** (« Nano Banana ») sont à **0/0** → inaccessibles. On fait donc du **text→image** avec Imagen 4 : la photo de profil **n'est pas** une image de référence (et n'est donc **pas** rendue obligatoire). L'apparence est injectée **dans le texte** du prompt pour s'en approcher, **sans garantie de cohérence**. À reconsidérer si un modèle image→image devient accessible.
- **Limites** : quota/coût image (25/jour partagés avec 7(b)) ; latence ; poids cumulé du stockage (plusieurs images par convo).

---

## Phase 5 — Robustesse & debug

### 9 — Repli des modèles + suivi d'utilisation *(demande initiale #9)* 🟡 ✅ Fait
Afficher dans l'app l'état d'utilisation des modèles (≥1 modèle texte + ses remplaçants si épuisé, 1 modèle image).

- **Fait — Chaîne de repli (texte)** : `environment.GEMINI_MODELS` (liste, du préféré au moins prioritaire) remplace `GEMINI_MODEL`. `GeminiService.generate` boucle sur la liste et bascule sur le suivant en cas de `429`, via un helper générique `withFallback` **partagé avec `generateImage`** (qui faisait déjà ce repli pour les images, 7b). `generate` renvoie désormais `{ text, model, usage, exhausted[] }` ; `generateImage` renvoie `{ image, model, exhausted[] }`.
- **Fait — Compteurs locaux** : `UsageService` + table `usage` (migration **v3**, `appVersion` 2 → 3). Lignes agrégées par **jour × modèle × type** (`text`/`image`) : requêtes, tokens, drapeau `exhausted`. `ChatService` (réponses, tour passé, illustration) et `CharacterService` (avatar) enregistrent chaque appel.
- **Fait — Tokens** : `usageMetadata` (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`) lu dans chaque réponse texte et cumulé.
- **Fait — État « épuisé »** : les modèles ayant renvoyé un `429` (remontés dans `exhausted`) sont marqués épuisés pour la journée et affichés comme tels.
- **Fait — Page debug** : `usage` (bouton 📊 dans l'en-tête personnages) ; affiche, pour le jour, chaque modèle des deux chaînes (préféré / épuisé), ses requêtes et tokens, + total de tokens, avec l'avertissement ci-dessous.
- **⚠️ Limite forte de l'API (assumée, affichée à l'utilisateur)** : l'API Gemini **n'expose pas** le quota restant du palier gratuit. Le suivi in-app est donc **estimé** (compteurs locaux + détection des `429`), pas une lecture officielle — c'est indiqué clairement sur la page.

---

## Récapitulatif de l'ordre

| Ordre | Fonctionnalité | Origine | Effort | État |
| ----- | -------------- | ------- | ------ | ---- |
| 0.1 | Refactor `PromptBuilder` | — | 🟢 | ✅ Fait |
| 0.2 | `id` stable sur les messages | — | 🟢 | ✅ Fait |
| 0.3 | Gestionnaire de versions de la bdd | — | 🟢 | ✅ Fait |
| 1 | Salutation du personnage | #2 | 🟢 | ✅ Fait |
| 2 | Narration en astérisques | #3 | 🟢 | ✅ Fait |
| 2b | Convention de dialogue (nom + guillemets) | — | 🟢 | ✅ Fait |
| 3 | Régénérer / supprimer un message | #8 | 🟡 | ✅ Fait |
| 3b | Passer son tour (faire reparler l'IA) | — | 🟡 | ✅ Fait |
| 4 | Personas | #1 | 🟡 | ✅ Fait |
| 5 | Champs de création enrichis | #5 | 🟡 | ✅ Fait |
| 6 | Mémoire permanente / contexte | #4 | 🔴 | ✅ Fait (moteur) |
| 6b | Écran de visualisation de la mémoire | — | 🟢 | ✅ Fait |
| 7 | Création assistée par IA (fiche + image) | #6 | 🔴 | ✅ Fait |
| 8 | Génération d'image dans le chat | #7 | 🔴 | ✅ Fait |
| 9 | Repli des modèles + suivi d'utilisation | #9 | 🟡 | ✅ Fait |
