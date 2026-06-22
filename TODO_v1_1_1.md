# TODO_v1_1_1 — Version 1.1.1 (correctif mineur)

Retours de recette de la 1.1 (sur mobile) + petits correctifs ciblés. Mise à jour **mineure** (correctif) → `1.1.1`. Même modèle : points **ordonnés par priorité**, avec constat, méthode, limites et **questions à trancher**.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

> **✅ Statut : tous les points (1 à 14) sont implémentés et la version est passée en 1.1.1.** Restent à valider sur le build mobile : le contour rouge 429 image (au prochain dépassement de quota) et le rendu général.

> **Recette 1.1** : B « réponses moins longues » → cappé à 3 paragraphes ✅ mais la longueur **par paragraphe dépasse encore** (parfois ~50 mots au lieu de ~30) → voir #1. C « mémoire » → reporté à une **1.2** (chantier plus large). A « image » → en attente du reset des neurons Cloudflare. Tout le reste : ✅.

---

## 1 — Resserrer la concision de la narration 🟢

**Constat** : la consigne actuelle (« 30 mots AU MAXIMUM par paragraphe », ≤ 3 paragraphes) est respectée pour le **nombre** de paragraphes mais pas pour la **longueur** (parfois ~50 mots). On resserre aussi le nombre de paragraphes.

- **Méthode** : reformuler la consigne dans `buildFormatBlock` (`utils/build-system-prompt.ts`) : « chaque paragraphe de narration = **1 à 2 phrases courtes** », et **au plus 2 paragraphes de narration** par réponse (au lieu de 3). **Décision** retenue.
- **Cohérence avec le draft (salutation)** : appliquer la **même limite** à la consigne `greeting` de `buildDraftPrompt` (`utils/build-draft-prompt.ts`) — prompt distinct du prompt système — pour que les salutations générées par IA soient aussi courtes.

## 2 — Pas de « … » lors d'une régénération 🟢

**Constat** : régénérer la dernière réponse affiche l'indicateur de saisie « … » (comme un envoi normal), ce qui n'a pas de sens puisqu'on remplace un message existant.

- **Méthode** : dans `chat.page.ts`, distinguer la régénération de l'envoi (ex. drapeau `regenerating` à part, ou ne pas activer l'indicateur dans `regenerate()`), et n'afficher `.chat-typing` que pour envoi / tour passé / illustration (`@if (sending && !regenerating)`).

## 3 — Suppression de persona : basculer les conversations sur le persona par défaut 🟢 🐞

**Constat** : à la suppression d'un persona, les conversations qui l'utilisaient gardent un `personaId` **pointant dans le vide** (plus aucun persona sélectionné → libellé « Persona », pas de sélection). La lecture retombe déjà sur le défaut côté prompt, mais l'état stocké est incohérent.

- **Méthode** : dans `PersonaService.remove(id)` (qui a déjà `DatabaseService`), après suppression, **réassigner** toutes les conversations dont `personaId === id` au persona **par défaut** (`getDefault()`). Ainsi `getActivePersonaId` renvoie un id valide et l'UI affiche « Moi ».
- **Limite** : le persona par défaut n'étant pas supprimable, il existe toujours comme cible de repli.

## 4 — Édition d'un persona : lister les conversations où il est actif 🟡

**Constat** : en éditant un persona, rien n'indique où il est utilisé.

- **Méthode** : en **mode édition** de `persona-form`, afficher la liste des conversations dont ce persona est actif, en **cards** (photo de profil ou pastille + nom, comme la liste des conversations). `ChatService.conversationsUsingPersona(personaId)` renvoie `PersonaUsage[]` (`characterName` + `avatarColor` + `avatarImage`). Injecter `ChatService` dans `persona-form.page.ts`.
- **Limite** : purement informatif (pas d'action depuis cette liste pour l'instant).

## 5 — Header : titre trop long → points de suspension 🟢

- **Méthode** : sur `.header-title` (`components/header/header.component.scss`), ajouter `min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` (le titre a déjà `flex: 1`).

## 6 — Header : destination du retour en dur (input), plus de `Location.back()` 🟡

**Constat** : le bouton retour du header fait `Location.back()`. En alternant le retour du header et le **bouton retour natif** du téléphone, on peut créer des **boucles** de navigation.

- **Méthode** : donner au header une **destination explicite** en input (ex. `backTo: any[]` = commandes de route) ; au clic, le header **navigue** vers cette destination (via `Router`) au lieu d'émettre un `back` traité par `Location.back()`. Retirer les `cancel()/goBack()` basés sur `Location` dans les sous-pages.
- **Destinations à coder en dur** :
  - `character-form` → `['characters']`
  - `persona-form` → `['personas']`
  - `memory/:id` → `['chat', characterId]`
  - `versions` → `['settings']`
  - `chat/:id` → `['conversations']` (**décision** retenue).
- **Limite** : on perd le « retour à l'écran précédent réel » au profit d'une destination fixe — c'est justement le but (pas de boucle).

## 7 — /tokens : estimer les tokens mais ne plus les afficher (ni l'avertissement) 🟢

- **Méthode** : conserver l'enregistrement des tokens dans `UsageService` (inchangé), mais **retirer leur affichage** dans `tokens.page.html` : enlever « ({{ totalTokens }} tokens aujourd'hui) » du titre et « · {{ totalTokens }} tokens » des lignes. (On garde les requêtes.)
- **Retirer aussi l'avertissement** sur l'inexactitude des estimations de tokens (paragraphe `.tokens-disclaimer`) : les tokens n'étant plus affichés, il n'a plus lieu d'être.

## 8 — /tokens : libellés 🟢

- **Méthode** (dans `tokens.page.html`) :
  - Section image : « Image (Cloudflare) » → « **Image** ».
  - Retirer les mentions « **aujourd'hui** » (titre texte + ligne image).
  - « **req** » → « **requêtes** » (lignes texte et image). Pour l'**image** (compte simple), accorder « requête »/« requêtes » selon le nombre (0/1 → singulier, ≥ 2 → pluriel) ; le texte reste « x / y requêtes » (ratio).

## 9 — /tokens : ne plus indiquer de modèle « préféré » 🟢

**Constat** : le premier modèle est marqué « Préféré ». Or les modèles sont **déjà affichés dans l'ordre de repli** (du préféré au moins prioritaire) → l'indication est redondante.

- **Méthode** : retirer le tag « Préféré » du markup `tokens.page.html`, **sans remplacement** (pas de contour spécial). L'ordre d'affichage exprime déjà la priorité.

## 10 — /tokens : 429 → contour rouge jusqu'au reset (texte ET image) 🟡

**Constat** : un 429 (quota épuisé) est signalé par un tag « épuisé » pour le **texte** seulement. L'**image** ne suit pas l'état épuisé (un 429 image est levé dans `ImageService` avant tout enregistrement).

- **Méthode** :
  - Remplacer le tag « épuisé » par un **contour rouge** (`var(--app-danger)`) sur la card du modèle concerné, **tant que c'est épuisé** (l'état `exhausted` est stocké par jour → se réinitialise au changement de jour).
  - **Image** : enregistrer aussi un 429 image. Capturer le `429` dans `ImageService.generate` (ou au point d'appel) et appeler un `UsageService.markImageExhausted(model)`. Afficher le contour rouge sur la card image.
- **Détection du 429 image** : Cloudflare signale le dépassement du quota gratuit par le **code d'erreur `4006`** (« daily free neuron limit exceeded »), pas forcément par un HTTP 429. Détecter via le **code/message d'erreur** Cloudflare dans `ImageService.generate` (le corps JSON contient déjà `errors[0]`), et marquer le modèle image épuisé.
- **Reset / fuseaux** (vérifié dans la doc Cloudflare) :
  - Texte (Gemini) : `UsageService.today()` est déjà en **Pacifique** (reset ~minuit PT) → OK.
  - Image (Cloudflare) : **toutes les limites du palier gratuit se réinitialisent à 00:00 UTC** → la date des lignes **image** doit être calculée en **UTC** (et non en Pacifique) pour que l'état épuisé se réinitialise au bon moment. Adapter `today()` pour distinguer le `kind` (text → Pacifique, image → UTC), ou ajouter un `todayUtc()`.

## 11 — Bloquer toutes les actions pendant qu'une est en cours 🟢 🐞

**Constat** : pendant un envoi / une régénération / un tour passé / une illustration (`sending = true`), les boutons **Envoyer**, **Passer mon tour**, **Illustrer** sont désactivés et **Régénérer** l'est aussi (`canRegenerate` teste `!sending`). Mais **Supprimer** (`canDelete`) **ne teste pas** `sending` → il reste cliquable, ce qui permet de lancer une suppression pendant une génération.

- **Méthode** : faire dépendre **toutes** les actions du même verrou `sending`. Pour les boutons des bulles (régénérer/supprimer), on les **garde affichés mais grisés** (comme « passer son tour » / « illustrer »), au lieu de les masquer : `canRegenerate`/`canDelete` ne gèrent plus que l'**applicabilité** (dernier message IA / hors salutation), et un input `disabled = sending` passé à `message-bubble` ajoute `[disabled]` aux deux boutons (+ style `:disabled` opacity 0.5). Les boutons `send`/`skip`/`illustrate` sont déjà `[disabled]="sending"`.
- **Résultat attendu** : tant qu'une action est en cours, **aucun** bouton (envoyer, régénérer, supprimer, passer son tour, illustrer) n'est actionnable ; les boutons des bulles sont **grisés**, pas masqués.

## 12 — Estimer la consommation de neurons Cloudflare (image) 🟡

**Contexte** : le palier gratuit Cloudflare = **10 000 neurons/jour** — c'est cette limite (neurons), et non le nombre de requêtes, qui borne réellement la génération d'image. Le coût est **estimable** : pour `flux-1-schnell`, Cloudflare facture **9,60 neurons / step** + **4,80 neurons / tuile 512×512**. `ImageService` envoie `steps: 4`.

- **Décision — résolution fixée à 512×512** : on fixe `width: 512`/`height: 512` dans la requête de `ImageService.generate` (corps JSON). Résolution suffisante pour l'usage, et **1 seule tuile** → estimation simple et précise.
- **Méthode** :
  - Coût par image = `steps × 9,60 + tuiles × 4,80` = `4 × 9,60 + 1 × 4,80` = **43,2 neurons/image** (constantes : `steps = 4`, 512×512 = 1 tuile).
  - Cumuler ces neurons estimés **par jour (UTC, cf. #10)** dans `UsageService` (champ `neurons` sur la ligne image, stocké comme les tokens via `DatabaseService`).
- **Ne pas afficher** : les neurons sont seulement **estimés et stockés** (comme les tokens texte), pas affichés dans /tokens.
- **Reste une estimation** : non officielle, à confronter au dashboard Cloudflare.

## 13 — Nom des personnages sur une seule ligne dans les cards 🟢

**Constat** : le nom du personnage peut passer sur **deux lignes** dans les cards. À limiter à **une ligne** (avec points de suspension si ça dépasse), pour un rendu homogène.

- **Méthode** : sur la classe du **nom** dans chaque card, ajouter `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` (+ `min-width: 0` en contexte flex). Pages/composants concernés :
  - `/characters` → nom dans `character-card`.
  - `/conversations` → `.conversation-name`.
  - `/persona-form` → `.persona-form-usage-name` (cards ajoutées au #4).

## 14 — Régénération après une image → réponse vide 🟢 🐞

**Constat** : régénérer un message situé juste après une illustration (typiquement : illustrer la scène → passer son tour → régénérer) renvoie systématiquement une **réponse vide**.

**Cause** : `regenerate` retire le dernier message puis appelle `generateReply`. Or `buildGeminiContents` **filtre les messages-images** : l'historique transmis se termine alors par un tour `model` (le message d'avant l'image, ou un message de « passer son tour »), sans tour `user` final → Gemini renvoie une réponse vide. Les messages de « passer son tour » sont normalement produits via `generateContinuation` (qui ajoute une amorce `user`), mais la régénération ne le faisait pas.

- **Méthode** : dans `ChatService.regenerate`, après le retrait, déterminer le **dernier tour réellement transmis** (dernier message non-image). S'il vient de l'utilisateur → `generateReply` ; sinon → `generateContinuation` (amorce). Au passage, garde de salutation simplifiée (`last === messages[0]` au lieu de `!hasUserTurn`), pour autoriser la régénération même sans message utilisateur préalable.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Narration plus courte (resserrer la consigne) | 🟢 | ✅ Fait |
| 2 | Pas de « … » lors d'une régénération | 🟢 | ✅ Fait |
| 3 | Suppression persona → conversations basculent sur le défaut | 🟢 🐞 | ✅ Fait |
| 4 | Édition persona : lister les conversations où il est actif | 🟡 | ✅ Fait |
| 5 | Header : ellipsis sur le titre trop long | 🟢 | ✅ Fait |
| 6 | Header : destination retour en dur (input) au lieu de `Location.back()` | 🟡 | ✅ Fait |
| 7 | /tokens : ne plus afficher les tokens ni l'avertissement (mais continuer à estimer) | 🟢 | ✅ Fait |
| 8 | /tokens : libellés (retirer « Cloudflare »/« aujourd'hui », « req » → « requêtes ») | 🟢 | ✅ Fait |
| 9 | /tokens : retirer l'indication « préféré » (ordre = repli) | 🟢 | ✅ Fait |
| 10 | /tokens : 429 → contour rouge jusqu'au reset (texte + image, image en UTC) | 🟡 | ✅ Fait |
| 11 | Chat : bloquer toutes les actions pendant qu'une est en cours (boutons grisés) | 🟢 🐞 | ✅ Fait |
| 12 | Estimer (et stocker) les neurons Cloudflare image — non affichés | 🟡 | ✅ Fait |
| 13 | Nom des personnages sur une seule ligne (ellipsis) dans les cards | 🟢 | ✅ Fait |
| 14 | Régénération après une image → réponse vide (amorce continuation) | 🟢 🐞 | ✅ Fait |

---

## Bump de version (à la fin) ✅ Fait
- ✅ `appVersionDisplay` → « **1.1.1** » ; `android/app/build.gradle` `versionName` « 1.1.1 », `versionCode` → **3**.
- ✅ Entrée **en tête** de `RELEASE_NOTES` (`utils/release-notes.ts`) : 1.1.1 avec la liste des points.
- ✅ `appVersion` (format bdd) **inchangé** (aucune migration).
- Commit final nommé **`1.1.1`**.

---

## Décisions tranchées
1. **#1** : narration = **« 1 à 2 phrases courtes »** par paragraphe, **≤ 2 paragraphes** par réponse.
2. **#6** : retour depuis le **chat** → **`conversations`**.
3. **#10** : reset Cloudflare confirmé à **00:00 UTC** (doc) → date des compteurs image en **UTC** ; dépassement détecté via le **code d'erreur 4006**.
4. **#12** : résolution image **fixée à 512×512** (1 tuile) → estimation **43,2 neurons/image** (`steps 4 × 9,60 + 1 × 4,80`).
