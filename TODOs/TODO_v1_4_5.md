# TODO_v1_4_5 — Version 1.4.5 (centrée sur /character-form)

Mise à jour **mineure** : génération IA mieux cadrée ({user} vs {char}), suppression du champ
« scénario », réordonnancement des détails de la fiche personnage.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

## Décisions (tranchées avant rédaction)

- **Champ « qui es-tu » de la génération IA** : **transitoire** (aide à la génération, comme le
  brouillon « Création par IA ») — **non persisté** sur le personnage.
- **Suppression de « scénario »** : **partout** (formulaire + prompt de génération + prompt système +
  type `Character`/`CharacterDraft`). Les anciennes valeurs restent en base mais ne sont plus lues
  (sans danger) → **pas de migration**, `appVersion` **inchangé** (4).
- **Réordonnancement** : aligner **partout** (formulaire + bloc personnage du prompt système + ordre
  de génération `propertyOrdering`) sur le même ordre.

---

## 1 — Génération IA : champ optionnel décrivant {user} (désambiguïsation) 🟡

**Constat** : quand le brouillon « Création par IA » décrit à la fois le personnage **et**
l'utilisateur, l'IA confond les rôles. Ex. : brouillon « Mon ami d'enfance qui déménage. Moi, je suis
étudiant en droit » → une fois sur deux le personnage généré devient l'étudiant en droit au lieu de
l'ami. Il manque un moyen de dire explicitement « ça, c'est {user}, pas le personnage ».

- **Méthode** :
  - `character-form.page.ts` : nouvelle propriété **transitoire** `userRole = ""` (réinitialisée dans
    `resetForm`, jamais enregistrée). Passée à la génération.
  - `character-form.page.html` : dans le bloc « Création par IA » (visible en création), ajouter sous
    le brouillon une **2ᵉ zone de texte optionnelle** « Ton rôle dans l'histoire (optionnel) »
    (libellé **affirmatif**, pas interrogatif), placeholder du type « Décris-toi pour situer ta
    relation au personnage. L'IA décrit le personnage, pas toi. ».
  - `character-service.ts` : `draftFromBrief(brief, userRole)` (param ajouté) → transmis à
    `buildDraftPrompt`. `mockDraft` ignore `userRole`.
  - `build-draft-prompt.ts` : `buildDraftPrompt(brief, userRole)`. Si `userRole` est renseigné, ajouter
    une section **claire** : ce texte décrit l'**UTILISATEUR** (désigné par {user}), **pas** le
    personnage à créer ; le personnage est le sujet du brouillon ; utiliser ces infos pour situer la
    relation (champ `initialRelationship`, mentions {user}) et **ne jamais** bâtir le personnage à
    partir d'elles.
- **Limites** : aide statistique (steering), pas une garantie absolue. Sans `userRole`, comportement
  inchangé.

## 2 — Suppression du champ « scénario » 🟡

**Constat** : le champ `scenario` (ajouté en 1.4) est retiré.

- **Méthode** (suppression partout) :
  - `character-service.ts` : retirer `scenario?` de `Character`, `"scenario"` du `Pick`
    `CharacterDraft`, et les lignes `scenario` de `normalizeDraft` et `mockDraft`.
  - `build-draft-prompt.ts` : retirer `scenario` de `properties`, `propertyOrdering` et `required` ;
    retirer la consigne « champ par champ » du scénario **et** l'exception « SAUF "scenario", à
    toujours proposer » dans les consignes générales.
  - `build-system-prompt.ts` (`buildCharacterBlock`) : retirer `appendField(... "Scénario / intrigue"
    ... character.scenario)`.
  - `character-form.page.{ts,html}` : retirer la propriété `scenario` (déclaration, `resetForm`,
    `loadIfEditing`, `generateDraft`, objet `draft` de `save`) et le bloc HTML du champ Scénario.
- **Limites** : données `scenario` existantes orphelines en base (inoffensives) ; pas de migration.

## 3 — Réordonnancement des détails (optionnels) de la fiche personnage 🟢

**Constat** : ordre actuel des détails peu logique. Nouvel ordre voulu :
**âge, apparence, relation initiale avec toi, goûts et préférences, histoire / passé, univers / cadre,
façon de parler, personnages qu'il connaît**.

- **Méthode** (aligner partout sur cet ordre) :
  - `character-form.page.html` : réordonner les blocs de la section « Détails (optionnels) ».
  - `build-system-prompt.ts` (`buildCharacterBlock`) : réordonner les `appendField` des détails après
    `systemPrompt` (personnalité) selon le même ordre.
  - `build-draft-prompt.ts` : réordonner `propertyOrdering` en conséquence (`name`, `systemPrompt`
    d'abord ; `greeting` toujours en dernier ; détails au milieu dans le nouvel ordre).
- **Limites** : léger changement de l'ordre vu par le modèle (assumé, cf. décision).

## 4 — Bump de version 1.4.5 🟢

- `VersionHandlerService.appVersionDisplay` → « **1.4.5** » ; `appVersion` **inchangé** (4).
- `android/app/build.gradle` : `versionName` « **1.4.5** », `versionCode` 15 → **16**.
- Entrée **en tête** de `RELEASE_NOTES` : 1.4.5.
- Commit final nommé **`1.4.5`**.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Génération IA : champ optionnel décrivant {user} | 🟡 | ✅ Fait |
| 2 | Suppression du champ « scénario » (partout) | 🟡 | ✅ Fait |
| 3 | Réordonnancement des détails (form + prompts) | 🟢 | ✅ Fait |
| 4 | Bump 1.4.5 | 🟢 | ✅ Fait |

---

## À valider après implémentation (recette)
- `/character-form` (création) : champ « Qui es-tu ? » présent sous le brouillon ; une génération avec
  un brouillon mêlant perso + « moi » crée bien le **personnage** (pas l'utilisateur).
- Plus de champ « Scénario » nulle part ; build et lint OK.
- Détails affichés dans le nouvel ordre (form), cohérent avec le prompt.
