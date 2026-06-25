# TODO_v1_4_1 — Version 1.4.1 (correctifs /character-form)

Mise à jour **mineure** : correctifs ergonomiques et de cohérence sur le formulaire de personnage, dont une **fusion de champs** qui nécessite une migration de bdd.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

> **✅ Statut : tous les points (1 à 6) sont implémentés, version passée en 1.4.1.** À valider en recette (cf. fin de document), notamment la migration des personnages existants.

## Décisions (tranchées avant rédaction)

1. **Libellés/placeholders** : déjà retouchés par l'utilisateur directement dans le HTML. On n'y touche QUE pour les points ci-dessous (message d'accueil multiligne, champ goûts fusionné).
2. **Champ fusionné** : `likes` + `dislikes` → un seul champ `preferences` (label « Goûts et préférences », placeholder « Ce qu'il aime ou non »).
3. **Migration** : fusion = changement de format → `appVersion` **3 → 4** + `updateToV4()`. Pour chaque personnage : `preferences` = `Aime <likes>` et/ou `N'aime pas <dislikes>` (parties présentes seulement), séparées par un simple retour à la ligne (pas de « ; » : double ponctuation disgracieuse) ; puis suppression des anciens `likes`/`dislikes`. Les valeurs ne contiennent pas « aime/n'aime pas » → on préfixe nous-mêmes.

---

## 1 — Fusion « goûts » + migration v3 → v4 🟡

- **`character-service.ts`** : `Character` — retirer `likes?`/`dislikes?`, ajouter `preferences?`. `CharacterDraft` — remplacer `likes`/`dislikes` par `preferences`. Mettre à jour `normalizeDraft` et `mockDraft`.
- **`build-system-prompt.ts`** (`buildCharacterBlock`) : remplacer les deux `appendField` (« Goûts… » / « Ce qu'il n'aime pas ») par un seul `appendField(lines, "Goûts et préférences", character.preferences)`.
- **`build-draft-prompt.ts`** : schéma (`properties`, `propertyOrdering`) et consigne — remplacer `likes`/`dislikes` par un unique `preferences` (« ce qu'il aime et ce qu'il n'aime pas »).
- **`version-handler-service.ts`** : `appVersion` 3 → 4 ; `init()` applique `updateToV4()` si `userVersion < 4` ; `updateToV4()` fusionne par personnage (préfixes « Aime »/« N'aime pas », séparateur « ` ;\n` ») et retire `likes`/`dislikes`.
- **`character-form`** (.ts/.html) : remplacer les deux champs par un seul `preferences` (placement inchangé : après « Relation initiale »).

## 2 — Réinitialisation des champs à l'ouverture (création) 🟢

**Constat** : ouvrir `/character-form` en création garde les valeurs de la fois précédente (champs, image, brouillon) — la page n'est pas détruite entre deux visites et `loadIfEditing` ne réinitialise rien sans id.

- **Méthode** (`character-form.page.ts`) : `ionViewWillEnter` appelle `resetForm()` **puis** `loadIfEditing()`. `resetForm()` remet à zéro tous les champs (y compris `brief`, `avatarImage`, `characterId` et les états `generating`/`generatingImage`). En édition, `loadIfEditing` re-remplit ensuite.

## 3 — Apparence en premier dans les détails 🟢

- **`character-form.page.html`** : déplacer le bloc « Apparence » en tête de la section « Détails (optionnels) » (avant « Scénario »).

## 4 — Sauts de ligne dans le placeholder du message d'accueil 🟢

- **`character-form.page.html`** : insérer de vrais retours à la ligne dans le placeholder du `greeting` (via `&#10;`) pour illustrer le format attendu (narration / réplique sur des lignes distinctes).

## 5 — Bouton « Enregistrer » sticky en bas 🟢

**Constat** : le formulaire est long ; il faut scroller jusqu'en bas pour enregistrer.

- **Méthode** (`character-form.page.scss`) : `.character-form-save` → `position: sticky; bottom: 0;` (+ `z-index`). Comme l'`ion-content` porte déjà `--padding-bottom: calc(16px + var(--safe-bottom))`, la position « collée » coïncide avec la position naturelle en fin de scroll → le bouton reste accessible et atterrit au même endroit qu'avant une fois tout en bas. Fond opaque (accent) déjà présent → masque le contenu qui défile derrière.

## 6 — Bump de version 1.4.1 🟢

- `VersionHandlerService.appVersionDisplay` → « **1.4.1** » ; `appVersion` **3 → 4** (migration).
- `android/app/build.gradle` : `versionName` « **1.4.1** », `versionCode` 11 → **12**.
- Entrée **en tête** de `RELEASE_NOTES` : 1.4.1.
- Commit final nommé **`1.4.1`**.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Fusion « goûts » + migration v3 → v4 | 🟡 | ✅ Fait |
| 2 | Réinitialisation des champs à l'ouverture | 🟢 | ✅ Fait |
| 3 | Apparence en premier dans les détails | 🟢 | ✅ Fait |
| 4 | Placeholder message d'accueil multiligne | 🟢 | ✅ Fait |
| 5 | Bouton « Enregistrer » sticky | 🟢 | ✅ Fait |
| 6 | Bump 1.4.1 | 🟢 | ✅ Fait |

---

## À valider après implémentation (recette)
- Anciens personnages : `likes`/`dislikes` bien fusionnés en « Goûts et préférences » (préfixes corrects, rien perdu).
- Ouvrir « Nouveau personnage » après en avoir édité un : tous les champs vides (dont image et brouillon).
- Apparence en tête des détails ; placeholder d'accueil sur plusieurs lignes.
- Bouton « Enregistrer » toujours visible, et à sa place habituelle une fois scrollé tout en bas.
