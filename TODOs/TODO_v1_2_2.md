# TODO_v1_2_2 — Version 1.2.2 (design / UI-UX)

Mise à jour **mineure**, centrée **design / UI-UX**. Retours de recette : salutation IA sans retours à la ligne, espacements (paddings bas dupliqués), refonte du flux Personnages/Conversations, et couleur de la status bar sur l'écran welcome.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

> **✅ Statut : tous les points (1 à 5) sont implémentés, version passée en 1.2.2.** À valider en recette : salutations IA (sauts de ligne), espacements, flux personnages/conversations, et status bar welcome (sur appareil).

---

## 1 — Salutation générée par IA : retours à la ligne 🟢

**Constat** : la salutation produite par la création assistée n'a pas de retours à la ligne (narration et répliques s'enchaînent sans séparation).

**Cause** : pas un bug de code — la consigne de saut de ligne existe déjà dans `buildDraftPrompt`, et l'affichage (`message-bubble`, `white-space: pre-wrap`) rend les `\n`. Mais en **sortie JSON structurée**, le modèle respecte mal cette consigne.

- **Méthode** : renforcer la consigne `greeting` de `buildDraftPrompt` (`utils/build-draft-prompt.ts`) avec un **exemple multi-lignes explicite** (narration sur sa ligne, réplique sur la sienne, `\n` réels) et insister : « passe réellement à la ligne (caractère de saut de ligne) entre narration et réplique ».
- **Limite** : dépend du suivi par le modèle ; à confirmer en recette.

## 2 — Espacements : listes en flex/gap + paddings bas dupliqués 🟡

**Constat** : double `padding-bottom` (le container de page **et** le `--padding-bottom` de l'`ion-content` / `.inner-scroll`) → trop d'espace en bas. Ex. `/versions` (`.versions-list`), `/settings` (`.settings-container` + dernière `.settings-section`).

- **Méthode — listes de cards en flex/gap** : pour `/characters`, `/conversations`, `/personas`, mettre le conteneur de liste en `display: flex; flex-direction: column; gap: 10px;` et **retirer les `margin-bottom`** des cards (`.character-card`, `.conversation-item`, `.persona-item`). *(`/persona-form` le fait déjà.)*
- **Méthode — paddings bas** : ne pas cumuler un `padding-bottom` de container avec le `--padding-bottom` de l'`ion-content`.
  - `/versions` : `.versions-list` → `padding: 16px 16px 0` (le bas vient du `--padding-bottom`).
  - `/settings` : `.settings-container` en flex/gap (`gap: 24px`, `padding: 16px 16px 0`) + retrait du `margin-bottom` de `.settings-section` ; le bas vient du `--padding-bottom`.
  - **Auditer** les autres pages (`/tokens`, `/memory`, `/characters`, `/conversations`, `/personas`) pour le même cumul et corriger.
- **Limite** : purement visuel ; vérifier que la marge basse (zone navbar / safe-area) reste correcte sur chaque page.

## 3 — Flux Personnages / Conversations 🟡

Aujourd'hui, cliquer une carte personnage ouvre la **conversation**, et l'édition se fait via un bouton sur la carte. On inverse la logique.

- **`/characters`** :
  - **Clic sur une carte → édition** du personnage (`character-form/{id}`).
  - **Retrait du bouton éditer** de `character-card` (devenu inutile) : output `edit`, méthode `onEdit`, et le bouton dans le HTML. On **garde** le bouton supprimer.
  - Câblage : `(open)="goToEdit(character)"` ; `goToChat` n'est plus utilisé ici.
- **`/conversations`** :
  - Ajouter un bouton **« + Nouvelle conversation »** (même style que « + Nouveau personnage » : toolbar en haut, `.characters-add` → équivalent `.conversations-add`).
  - Au clic → **modale de sélection d'un personnage** (liste des personnages, façon liste de sélection ; réutiliser `app-modal`). Sélection → `router.navigate(["chat", characterId])` (le chat crée la conversation si besoin).
  - Injecter `CharacterService` dans `conversations.page.ts` pour lister les personnages.
  - Mettre à jour l'**état vide** (« Aucune conversation… ») et **toujours afficher** le bouton.
- **Décision** : la modale liste **tous** les personnages (sélectionner ouvre la conversation, la créant si besoin).

## 4 — Welcome : status bar à la couleur de fond 🟢

**Constat** : l'écran welcome n'a pas de header → la status bar (couleur `--header-background`) tranche avec le fond `--app-background` de la page.

- **Méthode** : dans `ThemeService`, factoriser l'application de la status bar pour pouvoir choisir la couleur source :
  - `useBackgroundStatusBar()` → style du thème + fond = `--app-background`.
  - `useHeaderStatusBar()` → style du thème + fond = `--header-background` (comportement normal, déjà dans `applyTheme`).
  - `welcome.page.ts` : après `initTheme()`, appeler `useBackgroundStatusBar()` ; **avant** `goToCharacters()`, appeler `useHeaderStatusBar()` pour que les pages à header retrouvent la bonne couleur.
- **Limite** : effet Android (cf. edge-to-edge) ; à valider sur appareil.

## 5 — Bump de version 1.2.2 🟢 ✅ Fait

- ✅ `VersionHandlerService.appVersionDisplay` → « **1.2.2** ».
- ✅ `android/app/build.gradle` : `versionName` « **1.2.2** », `versionCode` → **6**.
- ✅ `appVersion` (format bdd) **inchangé**.
- ✅ Entrée **en tête** de `RELEASE_NOTES` : 1.2.2.
- Commit final nommé **`1.2.2`**.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Salutation IA : retours à la ligne (prompt draft) | 🟢 | ✅ Fait |
| 2 | Listes en flex/gap + paddings bas dupliqués | 🟡 | ✅ Fait |
| 3 | Flux : clic perso = édition + « Nouvelle conversation » (modale) | 🟡 | ✅ Fait |
| 4 | Welcome : status bar = couleur de fond | 🟢 | ✅ Fait |
| 5 | Bump 1.2.2 | 🟢 | ✅ Fait |

---

## À valider après implémentation (recette)
- Salutation IA : narration et répliques sur des lignes distinctes.
- Plus d'espace excessif en bas des pages ; espacement des cards homogène.
- Clic sur une carte personnage → édition ; suppression toujours possible. Nouvelle conversation via la modale de l'onglet Conversations.
- Welcome : status bar de la même couleur que le fond de l'écran (sur appareil).
