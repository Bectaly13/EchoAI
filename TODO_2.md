# TODO_2 — Correctifs (après recette)

Liste des correctifs et ajustements issus des **tests fonctionnels** de la première version. Même modèle que `TODO.md` : reformulés, **ordonnés par priorité** (rapport valeur/effort + dépendances, pas l'ordre des tests), avec la méthode d'implémentation ou les limites pour chaque point. La référence entre parenthèses (ex. « corrige 7b ») renvoie au point d'origine dans `TODO.md`.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

> Périmètre : ce document ne couvre **que** les correctifs fonctionnels. Les remarques d'UI/UX, de navigation et de rendu feront l'objet d'un `TODO_UI.md` séparé.

---

## 1 — Génération d'image de profil : dégradation propre sur le palier gratuit *(corrige 7b)* 🟢 ✅ Fait (dégradé) — fonctionnalité parquée
Diagnostic mené : ce n'est **pas un bug de code**. La génération d'image est **inaccessible sur le palier gratuit** de la clé.

- **Cause racine (vérifiée par appel direct à l'API)** : Imagen 4 (`:predict`) renvoie **HTTP 400 « only available on paid plans »** ; les modèles image en `generateContent` (« Nano Banana » : `gemini-2.5-flash-image`, `gemini-3.1-flash-image`, `gemini-3-pro-image`) renvoient **HTTP 429** avec un quota gratuit de **0**. Aucun modèle image n'est donc utilisable sans plan payant.
- **Fait — Surfaçage des erreurs** : util `describe-api-error.ts` (statut + message de l'API) branché sur les échecs image, + `console.error` pour le diagnostic. Améliore aussi les futurs messages d'erreur réels.
- **Fait — Drapeau** : `environment.GEMINI_IMAGE_ENABLED` (false en gratuit). `GeminiService.imageEnabled()` = drapeau + clé. Exposé via `CharacterService.canGenerateImage()` ; `generateAvatar` lève `image-disabled` si désactivé.
- **Fait — UI** : quand c'est désactivé, le formulaire masque les boutons de génération et affiche une note claire (« indisponible sur le palier gratuit, nécessite un plan payant ») ; la **pastille de couleur** reste l'avatar.
- **Parqué (jusqu'à un plan payant)** : la génération réelle de l'avatar **et le prompt image dédié** (champ « prompt image » non vide transmis à la place de « Apparence », persisté en `Character.avatarPrompt` pour régénérer). À faire quand `GEMINI_IMAGE_ENABLED` passera à true.

## 2 — Illustration de scène : dégradation propre *(corrige 8)* 🟢 ✅ Fait (dégradé) — fonctionnalité parquée
Même cause racine que #1 (aucun modèle image accessible en gratuit).

- **Fait — Drapeau** : `ChatService.canIllustrate()` (= `GeminiService.imageEnabled()`) ; `illustrateScene` lève `image-disabled` si désactivé.
- **Fait — UI** : le bouton 🖼 du chat est masqué quand la génération d'image est désactivée.
- **Parqué (jusqu'à un plan payant)** : l'illustration réelle (prompt auto-construit depuis apparence + lieu mémorisé + derniers messages). Rappel de l'écart assumé : palier gratuit = pas d'image→image, donc pas de cohérence d'apparence garantie même en payant.

## 3 — Invariant de suppression : ne jamais finir sur un message utilisateur *(corrige 3)* 🟢 ✅ Fait
La suppression d'un message du personnage fonctionnait déjà (bouton 🗑 sur **toutes** les bulles, suppression du message **et de tous les suivants**). Manquait l'invariant.

- **Fait — Règle** : une conversation ne peut **jamais** se terminer par un message `user`. Dans `ChatService.deleteFrom`, après le `splice`, une boucle « tant que le dernier message est `user` » rogne le(s) message(s) utilisateur final/aux. La **purge mémoire** par `sourceMessageId` est calculée **après** le rognage (sur l'ensemble final).
- **Effet** : supprimer une réponse de l'IA déclenchée par un message utilisateur ramène la conversation **avant** ce message (pas d'historique se terminant sur une question sans réponse). Seul `deleteFrom` peut produire ce cas (les autres flux finissent toujours sur un `model`).
- **Vérifié** (simulation) : suppression d'une réponse IA → retire aussi le message utilisateur déclencheur ; suppression d'un message utilisateur → reste sur la réponse précédente ; id inconnu → sans effet.

## 4 — Persona par défaut « Moi » + sélection descriptive *(corrige 4)* 🟡 ✅ Fait
L'utilisateur a **toujours** un persona actif (au minimum pour transmettre son nom à l'IA). « Aucun persona » a disparu.

- **Fait — Persona « Moi » garanti** : `PersonaService.ensureDefault()` (idempotent) crée le persona par défaut (`isDefault: true`) s'il n'existe pas. Appelé au démarrage via `provideAppInitializer` **après** les migrations → couvre nouveaux et anciens utilisateurs. **Pas de migration versionnée** : `isDefault` est un champ optionnel (même logique qu'au point 5), l'invariant est posé au démarrage.
- **Fait — Nom demandé une fois** : au premier lancement, la page personnages invite à nommer le persona (`AlertController`), puis mémorise le fait via `StorageService` (clé `defaultPersonaNamed`, comme la clé `version`) pour ne plus le redemander. Le persona reste éditable ensuite.
- **Fait — Non supprimable** : `PersonaService.remove` ignore un persona `isDefault` ; le bouton 🗑 est masqué et un tag « par défaut » s'affiche sur la page Personas.
- **Fait — Toujours actif** : `persistNewConversation` initialise `personaId` sur le défaut ; `personaFor` et `getActivePersonaId` **retombent sur le défaut** si aucun choix (ou persona supprimé). Les conversations existantes sans `personaId` sont gérées par ce fallback (pas de réécriture). La sélection « aucun » est retirée.
- **Fait — Modale descriptive** : la sélection affiche `nom — début de description` (description tronquée à 80 caractères) pour chaque persona.
- **Limite** : l'invite de nom est volontairement « soft » (ignorable, le persona garde « Moi ») et n'est proposée qu'une fois.

## 5 — Salutation obligatoire + conventions sur la salutation générée *(corrige 1 et 7a)* 🟡
La salutation devient **obligatoire**, et celle **générée par l'IA** doit suivre les conventions d'écriture des messages.

- **Salutation obligatoire** : champ requis dans `character-form` (validation au `save`, comme le nom). `Character.greeting` ne doit plus être vide. Conséquence : le comportement « paresseux » (conversation non créée tant qu'il n'y a pas de salutation) n'a plus lieu d'être.
- **Conventions sur la salutation générée (7a)** : le `greeting` produit par `draftFromBrief` doit respecter le **format des messages** — narration entre astérisques, répliques préfixées par le nom + deux points + guillemets (`Nom : "…"`). Méthode : enrichir l'instruction de `buildDraftPrompt` pour le champ `greeting` (rappeler ces conventions, comme le fait `buildFormatBlock` côté chat).
- **Limite** : personnages **existants** sans salutation → à gérer (forcer une saisie à la prochaine édition, ou valeur de repli). À préciser au moment de l'implémentation.

## 6 — Mémoire : créer et éditer un souvenir *(corrige 6b)* 🟡
La **suppression unitaire** d'un souvenir existe déjà (🗑 par entrée) en plus de « Tout oublier ». Ajouts : **créer** et **éditer**.

- **Créer un souvenir** : choisir la **catégorie** (Lieu, Relation, Jalons, Consignes) et saisir la valeur. Méthode : `ChatService.addMemoryEntry(characterId, category, value)` respectant les règles existantes (catégories à valeur unique → remplacement ; à valeurs multiples → ajout borné par `capMemory`).
- **Éditer un souvenir** : modifier la valeur d'une entrée existante. Méthode : `ChatService.updateMemoryEntry(characterId, entryId, value)`.
- **UI** : bouton « + Ajouter un souvenir » (avec choix de catégorie) sur la page mémoire, et bouton ✎ sur chaque entrée. Saisie via `AlertController` (champ texte) ou petit formulaire.
- **Limite (rollback)** : une entrée **créée/éditée manuellement** ne doit pas être effacée par le rollback de régénération/suppression. Méthode : marquer son `sourceMessageId` avec une **valeur sentinelle** (ex. `"manual"`) que `forgetMemoryFrom` / la purge de `deleteFrom` ignorent.

## 7 — Comptabiliser TOUS les appels IA + afficher le max (RPD) par modèle *(corrige 9)* 🟡
Le suivi de tokens ignore certains appels (ex. la **création de fiche par IA**, 7a, qui passe par `generateStructured`), et on ne voit pas la **limite** par modèle.

- **Comptabiliser tous les appels** : aucun chemin d'appel à l'IA ne doit échapper au suivi. `GeminiService.generateStructured` doit remonter `{ data, model, usage, exhausted }` (comme `generate`), et `CharacterService.draftFromBrief` doit appeler `UsageService.recordText`. Vérifier qu'il ne reste **aucun** appel non comptabilisé (audit des usages de `GeminiService`).
- **Afficher le max (RPD) par modèle** : déclarer la limite **requêtes/jour** de chaque modèle dans `environment` (l'API n'exposant pas le quota restant). Méthode : transformer `GEMINI_MODELS` / `GEMINI_IMAGE_MODELS` en objets `{ id, rpd }` (ou table parallèle de limites), répercuter dans `example`/`prod`, et adapter `GeminiService` (qui lit `model.id`). La page `usage` affiche alors « X / RPD » par modèle.
- **⚠️ Limite forte (rappel)** : le RPD affiché est une **valeur configurée à la main** ; combiné aux compteurs locaux, cela reste une **estimation**, pas une lecture officielle du quota (l'API ne l'expose pas). À garder explicite sur la page.

---

## Récapitulatif de l'ordre

| Ordre | Correctif | Corrige | Effort | État |
| ----- | --------- | ------- | ------ | ---- |
| 1 | Génération d'image de profil : dégradation propre (gratuit) | 7b | 🟢 | ✅ Fait (dégradé) · génération parquée (plan payant) |
| 2 | Illustration de scène : dégradation propre (gratuit) | 8 | 🟢 | ✅ Fait (dégradé) · génération parquée (plan payant) |
| 3 | Invariant de suppression (jamais finir sur l'utilisateur) | 3 | 🟢 | ✅ Fait |
| 4 | Persona par défaut « Moi » + sélection descriptive | 4 | 🟡 | ✅ Fait |
| 5 | Salutation obligatoire + conventions sur la salutation générée | 1, 7a | 🟡 | À faire |
| 6 | Mémoire : créer et éditer un souvenir | 6b | 🟡 | À faire |
| 7 | Comptabiliser tous les appels IA + max RPD par modèle | 9 | 🟡 | À faire |
