# TODO_v1_4_2 — Version 1.4.2 (aperçus, boutons sticky, persona par défaut)

Mise à jour **mineure** : interpolation des balises dans l'aperçu des cartes personnage, boutons « + » des listes rendus sticky en bas (comme « Enregistrer »), et enrichissement du persona par défaut (apparence + description).

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

## Décisions (tranchées avant rédaction)

1. **Aperçu /characters** : la carte affiche `character.systemPrompt` (la personnalité). On y interpole `{char}` (→ nom du personnage) et `{user}`. Pour `{user}` : le persona **de la conversation** avec ce personnage si elle existe, sinon le **persona par défaut** (`ChatService.getActivePersonaId` assure ce repli) ; fallback « l'utilisateur ». Nom résolu **par personnage** côté page (`userNames[characterId]`).
2. **Boutons d'action toujours en bas** : les boutons « + » (listes) **et** « Enregistrer » (/character-form) doivent être **toujours plaqués en bas de l'écran** (au-dessus de la navbar / zone sûre), **même quand le contenu est court**, et **sans saut** à fond de scroll. Technique : la **zone de scroll** de l'`ion-content` devient une **colonne flex** (`::part(scroll) { display:flex; flex-direction:column }`) et le bouton est poussé en bas par `margin-top: auto`, en restant `position: sticky; bottom: 0` pour le défilement. Pleine largeur, fond accent. Le `sticky` seul (tenté en premier) ne convient pas : il ne colle pas si la liste ne déborde pas, et le `--padding-bottom` de l'inner-scroll provoque un léger saut.
3. **Pas de migration** : aucun changement de format de données → `appVersion` **inchangé** (4).
4. **/conversations** : l'aperçu (`lastMessage`) n'a pas besoin d'interpolation — la salutation est déjà interpolée à sa matérialisation (1.4), et les messages IA ne contiennent pas de balises.

---

## 1 — Interpolation des balises dans l'aperçu de la carte personnage 🟢

- **`character-card.component.ts`** : ajouter un input `userName = input<string>("")` ; méthode `preview()` qui renvoie `interpolateTags(character().systemPrompt, character().name, userName() || "l'utilisateur")` (import de l'util `interpolate-tags`).
- **`character-card.component.html`** : remplacer `{{ character().systemPrompt }}` par `{{ preview() }}`.
- **`characters.page.ts`** : `loadUserNames()` construit `userNames` (id du personnage → nom) via `chatService.getActivePersonaId(id)` puis `personaService.get(...)` (persona de la conversation, sinon défaut).
- **`characters.page.html`** : passer `[userName]="userNames[character.id] ?? ''"` à `app-character-card`.

## 2 — Boutons d'action toujours plaqués en bas (pleine largeur) 🟡

Pour **/characters**, **/conversations** et **/character-form** :

- **/characters & /conversations — HTML** : sortir le bouton « + » de la `*-toolbar` du haut et le placer en **dernier enfant** de l'`ion-content` (après le bloc `@if/@else`, toujours visible, y compris liste vide). Retirer la `*-toolbar`.
- **Listes (/characters, /conversations)** : `ion-content.<page>-content::part(scroll) { display:flex; flex-direction:column }` → zone de défilement en colonne flex. Le bouton (`.characters-add` / `.conversations-add`) : `margin: auto 12px 0` (le `margin-top: auto` le plaque en bas même liste courte ; pas de marge basse → pas de saut), `position: sticky; bottom: 0; z-index: 1`, style accent (padding 14px, radius 12px, font 16px/600). La liste (`.*-list`) reçoit `margin-bottom: 12px` → écart visible avec le bouton quand elle déborde, absorbé par le `margin-top: auto` quand elle est courte.
- **/character-form** : le formulaire dépasse toujours d'un écran → pas besoin du plaquage flex. On garde le bouton « Enregistrer » en `position: sticky; bottom: 0` avec `margin-top: 24px` (écart au dernier champ). Pas de marge basse → pas de saut.
- Le `--padding-bottom` de l'`ion-content` (navbar + zone sûre) cale le bouton juste au-dessus de la navbar / zone sûre.
- **Limite (recette)** : rendu à vérifier sur appareil (pin en bas liste courte, absence de saut, écart bouton/liste, position vs navbar et zone sûre).

## 3 — Persona par défaut : apparence + description 🟡

**But** : le persona par défaut (« Moi ») ne peut aujourd'hui définir que son **nom** et son **genre** ; description et apparence lui sont masquées. On veut pouvoir les renseigner (comme pour les autres personas), et les proposer dès la première connexion.

**Décisions** : description et apparence **restent optionnelles** (comme pour les autres personas) ; à la première connexion, les nouveaux champs sont **facultatifs** (« Plus tard » continue de tout passer). Pas de migration (champs déjà présents sur `Persona`, juste masqués jusqu'ici). La modale de **sélection de persona** dans `/chat/{id}` reste **nom + description** uniquement (pas d'apparence, pour ne pas la surcharger) — déjà le cas, on n'y touche pas.

- **`/persona-form` (édition du persona par défaut)** :
  - `persona-form.page.html` : retirer le garde `@if (!isDefault)` qui masque description + apparence → ces champs s'affichent aussi pour le persona par défaut. (Le `.ts` charge et enregistre déjà `description`/`appearance` ; rien à changer côté sauvegarde.)
- **Première connexion (modale `namePrompt` dans `/characters`)** :
  - `characters.page.ts` : étendre l'état `namePrompt` avec `description` et `appearance` ; les passer dans l'`update` de `saveUserName()`.
  - `characters.page.html` : ajouter dans la modale les champs description et apparence (sous le nom + le genre). La modale a déjà un corps défilable (titre/boutons fixes) → la hauteur supplémentaire est gérée.
- **Limite** : la première connexion devient un peu plus longue à remplir, mais les nouveaux champs sont facultatifs (skippables via « Plus tard »).

## 4 — Bump de version 1.4.2 🟢

- `VersionHandlerService.appVersionDisplay` → « **1.4.2** » ; `appVersion` **inchangé** (4).
- `android/app/build.gradle` : `versionName` « **1.4.2** », `versionCode` 12 → **13**.
- Entrée **en tête** de `RELEASE_NOTES` : 1.4.2.
- Commit final nommé **`1.4.2`**.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Interpolation des balises dans l'aperçu de la carte personnage | 🟢 | ✅ Fait |
| 2 | Boutons d'action toujours plaqués en bas (« + » + Enregistrer) | 🟡 | ✅ Fait |
| 3 | Persona par défaut : apparence + description (form + 1ʳᵉ connexion) | 🟡 | ✅ Fait |
| 4 | Bump 1.4.2 | 🟢 | ✅ Fait |

---

## À valider après implémentation (recette)
- /characters : un personnage dont la personnalité contient `{char}`/`{user}` affiche les vrais noms dans l'aperçu.
- Boutons « + » toujours accessibles, collés en bas, pleine largeur ; le dernier item de la liste n'est pas masqué une fois scrollé tout en bas ; rendu correct au-dessus de la navbar.
- Persona par défaut : description et apparence éditables dans /persona-form ; proposées (facultatives) à la première connexion et bien enregistrées.
