# TODO_v1_5 — Version 1.5 (expérience de conversation)

Mise à jour **moyenne**, centrée sur le chat : édition d'un message (modale), aparté hors-personnage (OOC), et un indicateur de frappe revisité. Le **streaming est abandonné** (CapacitorHttp bufferise les réponses sur appareil → vrai SSE impossible nativement ; choix assumé).

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

## Décisions (tranchées avant rédaction)

- **Streaming** : abandonné (cf. ci-dessus).
- **Édition** : tous les messages **porteurs de texte SAUF la salutation** (1er message) ; messages-image exclus (pas de texte). L'édition **ne régénère pas** les messages suivants ; elle modifie le stockage donc l'historique futur envoyé à Gemini en tient compte. La mémoire permanente n'est **pas** recalculée (assumé).
- **OOC** : nouveau **type** de message (`kind: "ooc"`), ajouté via un **bouton dédié + modale**. Il reste dans la conversation, **ne déclenche aucune réponse**, et est transmis à Gemini en tant que tour `user` **encapsulé**, présenté comme un **ORDRE ABSOLU** à respecter (sans le mentionner dans le récit). Éditable et supprimable comme les autres.
- **Pas de migration** : `kind?` est un champ **optionnel** sur les messages (absent = message normal) → `appVersion` **inchangé** (4).

---

## 1 — Édition d'un message (modale) 🟡

**Constat** : aujourd'hui on ne peut que régénérer (dernier message IA) ou supprimer. Pas d'édition directe.

- **Méthode** :
  - `chat-service.ts` : `editMessage(characterId, messageId, newText)` → trouve le message, remplace `text` (trim ; no-op si vide), `saveConversation`. Ne touche ni aux messages suivants, ni à la mémoire.
  - `message-bubble.component.ts` : ajouter `canEdit = input<boolean>(false)` et `edit = output<void>()`.
  - `message-bubble.component.html` : bouton ✎ dans `.message-bubble-actions`, affiché si `canEdit()`, `[disabled]="disabled()"`, `(click)="edit.emit()"`.
  - `chat.page.ts` : `canEdit(message)` = `message !== messages[0]` ET `!message.imageData` (et vaut aussi pour les OOC) ; état `editModal = { open, messageId, value }` ; `openEdit(message)` (pré-remplit `value` avec le texte) ; `saveEdit()` → `chatService.editMessage(...)` puis recharge les messages.
  - `chat.page.html` : `app-modal` d'édition (textarea pré-rempli + Annuler/Valider). Câbler `(edit)="openEdit(message)"` sur la bulle.
- **Limites** : éditer un message IA qui avait posé un jalon ne recalcule pas la mémoire (jalon conservé tel quel). Assumé.

## 2 — Aparté hors-personnage (OOC) 🟡

**Constat** : pas de moyen de glisser une instruction au modèle sans casser le roleplay ni provoquer de réponse.

- **Méthode** :
  - `chat-service.ts` : `ChatMessage` gagne `kind?: "ooc"`. `addOocNote(characterId, text)` → pousse `{ id, role: "user", kind: "ooc", text, at }` (sans génération), `saveConversation`, renvoie les messages.
  - `build-gemini-contents.ts` : si `message.kind === "ooc"`, émettre `{ role: "user", parts: [{ text: "[Instruction hors-personnage de l'utilisateur — ORDRE ABSOLU à respecter, sans jamais la mentionner dans le récit : <texte>]" }] }` ; sinon mapping actuel. (Les OOC restent comptés dans les MAX_MESSAGES.) Pas de précision de timing (« immédiatement »…) : laisser le modèle l'intégrer naturellement au scénario.
  - **Logique de contrôle** (`chat-service.ts`) :
    - `deleteFrom` : la boucle « ne pas terminer sur un message utilisateur » ne doit pas retirer un OOC final → condition `role === "user" && kind !== "ooc"`.
    - `regenerate` : si le dernier message est un OOC, la régénération reste bloquée (on ne régénère que le dernier message `model`) — **choix (a) confirmé** : pour régénérer, supprimer d'abord l'OOC.
  - **Rendu** (`chat.page.html`) : dans la boucle, `@if (message.kind === 'ooc') { <div class="chat-ooc"> … texte … boutons éditer/supprimer … </div> } @else { <app-message-bubble …> }`. Style `.chat-ooc` : encart centré, sobre, en retrait (italique, couleur `var(--app-text-muted)`), visuellement distinct d'une bulle user/IA.
  - **Déclencheur** (`chat.page.{ts,html}`) : bouton dédié dans `.chat-quick` (à côté de ⏭ / 🖼) ouvrant `oocModal = { open, value }` ; `saveOoc()` → `chatService.addOocNote(...)` puis recharge. `[disabled]="sending"`.
  - L'OOC réutilise l'édition (point 1) et la suppression existantes.
- **Limites** : deux tours `user` consécutifs possibles (OOC puis message envoyé, ou OOC puis « passer son tour ») — accepté par l'API Gemini. Supprimer remonte depuis l'OOC comme pour tout message (cohérent).

## 3 — Indicateur de frappe : étoile monochrome qui tourne 🟢

**Constat** : pendant l'attente d'une réponse, on affiche « … ». On remplace par une étoile « type IA », monochrome (suit le thème), qui tourne.

- **Méthode** : classe partagée `.ai-typing-star` dans `global.scss` (taille + couleur `var(--app-accent)` + rotation) ; `/chat` remplace `<p class="chat-typing">…</p>` par `<ion-icon class="chat-typing ai-typing-star" name="sparkles">` (`addIcons({ sparkles })` dans `ChatPage`). Même condition d'affichage (`sending && !regenerating`).
- **Page `/test`** (ajout demandé) : page **non référencée** (accès via l'URL `/test` uniquement), affichant l'icône `.ai-typing-star` centrée en permanence, à la même taille que dans `/chat` (classe partagée) → pour étudier/ajuster le rendu. Route ajoutée dans `app.routes.ts` ; composant `pages/test/`.
- **Limites** : purement cosmétique. La page `/test` a servi au réglage puis a été **retirée** avant la 1.5 (composant + route + spec). La classe partagée `.ai-typing-star` reste (utilisée par `/chat`).
- **Réglage final validé** : spin 360° sur **45 %** du cycle, durée **1,5 s**, overshoot via `cubic-bezier(0.34, 1.56, 0.64, 1)`.

## 4 — Bump de version 1.5 🟢

- `VersionHandlerService.appVersionDisplay` → « **1.5** » ; `appVersion` **inchangé** (4).
- `android/app/build.gradle` : `versionName` « **1.5** », `versionCode` 18 → **19**.
- Entrée **en tête** de `RELEASE_NOTES` : 1.5.
- Commit final nommé **`1.5`**.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Édition d'un message (modale) | 🟡 | ✅ Fait |
| 2 | Aparté hors-personnage (OOC) | 🟡 | ✅ Fait |
| 3 | Indicateur de frappe : étoile qui tourne (+ page /test) | 🟢 | ✅ Fait |
| 4 | Bump 1.5 | 🟢 | ✅ Fait |

---

## À valider après implémentation (recette)
- Éditer un message utilisateur et un message IA (pas la salutation) : le texte change, les messages suivants restent, et l'historique envoyé à Gemini reflète l'édition.
- Ajouter un OOC : encart distinct, aucune réponse déclenchée ; le tour suivant en tient compte. OOC éditable et supprimable.
- L'indicateur d'attente affiche une étoile monochrome (`sparkles`) qui tourne, accordée au thème.
- tsc, lint, build OK.
