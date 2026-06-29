# TODO_v1_4_4 — Version 1.4.4 (correctifs mineurs)

Mise à jour **mineure** : réponses vides (diagnostic + retry), contenu « adulte » (disclaimer +
champ âge), bouton de `/personas`, warning de build.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

## Décisions (tranchées avant rédaction)

- **Réponses vides** : diagnostic **ET** patch dans cette même version. Diagnostic en amont (point 1,
  log du `finishReason`) → cause confirmée : **`finishReason: "PROHIBITED_CONTENT"`** (blocage
  **non configurable** côté Google, sur l'**output** généré, indépendant des `safetySettings`).
  Patch (point 2) : re-tirage interne + erreur claire si échec.
- **Contenu « adulte » (point 3)** : le filtre ne se désactive pas côté app ; on réduit les **faux
  positifs** en **pilotant l'output** vers du contenu non ambigu → disclaimer global (formulation
  **positive**, pas de négation) + champ **âge** dans les fiches personnage et persona, transmis dans
  le prompt. Effet espéré sur le **taux de réussite**, pas une garantie (se combine au retry).
- **Pas de migration BDD** : `age?` est un champ **optionnel** sur `Character` et `Persona` (absent =
  non renseigné) → `appVersion` **inchangé** (4). Champ **texte libre** (tolère « 27 ans », « adulte »,
  un âge fantastique…), **non imposé** dans les formulaires (cohérent avec les autres champs).
- Modale de **première connexion** (`/characters`) : on y **ajoute aussi le champ âge** (en plus de
  nom/genre/description/apparence), pour cadrer le persona par défaut dès le départ.

---

## 1 — Diagnostic des réponses textuelles vides (instrumentation) 🟡 ✅

**Constat** : réponse textuelle parfois vide (cause probabiliste côté API), message vide persisté et
requête comptée pour rien.

- **Méthode** (`gemini-service.ts`, `generate()`) : quand le texte extrait est vide, `console.warn`
  structuré (`finishReason`, `blockReason`, `candidateCount`, `partCount`, `partsHaveText`,
  `safetyRatings` candidat + prompt, `usage`). Observable via DevTools WebView / logcat.
- **Résultat** : cause confirmée = **`PROHIBITED_CONTENT`** sur `candidates[0].finishReason` (output),
  `promptFeedback.blockReason` vide → ce n'est pas l'input mais la **génération** qui est recalée.

## 2 — Patch des réponses vides : retry ×3 + erreur si échec 🟡 ✅

**Constat** : on ne peut pas empêcher le blocage serveur ; re-tirer (échantillonnage différent) finit
souvent par passer. Il faut aussi ne **rien laisser** de vide dans le chat en cas d'échec.

- **Méthode** :
  - `chat-service.ts` : `MAX_EMPTY_RETRIES = 3` ; helper `generateText()` qui appelle Gemini,
    **comptabilise chaque requête réelle** (`usage.recordText`), et re-tire tant que le texte est vide
    (4 appels max). Lève `"empty-response"` si tous vides → ni message vide ni message utilisateur
    persistés (l'erreur survient avant `saveConversation`). `generateReply` et `generateContinuation`
    passent par ce helper (couvre envoi, régénération, passer-son-tour).
  - `chat.page.ts` : helper `generationError()` (toast clair « contenu bloqué, réessaie/reformule »
    pour `"empty-response"`, message technique sinon), branché dans `send`/`skip`/`regenerate`. Dans
    `send()`, en cas d'échec : **recharge** `this.messages` (retire la bulle utilisateur optimiste) et
    **rend le texte** au champ de saisie pour réessayer.
- **Invariant** : aucune conversation ne se termine sur un message utilisateur (le tour entier est
  annulé, rien n'est sauvegardé).
- `gemini-service.ts` : le `console.warn` du point 1 devient une trace permanente (utile en logcat).

## 3 — Contenu « adulte » : disclaimer global + champ âge (personnage & persona) 🟡

**Constat** : les faux positifs `PROHIBITED_CONTENT` se déclenchent surtout quand l'output mêle des
indices de jeunesse à un contexte mature. On pilote l'output vers du contenu **non ambigu**.

- **Méthode** :
  - **Disclaimer global** (`build-system-prompt.ts`) : nouveau bloc dédié (formulation **positive**),
    poussé parmi les consignes, du type : « Tous les personnages de cette fiction (toi, l'utilisateur
    et les personnages secondaires) sont des adultes majeurs ; décris-les et désigne-les comme tels,
    sans ambiguïté d'âge. » Toujours présent.
  - **Champ âge — personnage** :
    - `character-service.ts` : `age?: string` sur `Character` ; `"age"` ajouté au `Pick` de
      `CharacterDraft` ; `normalizeDraft` (`age: value("age")`) et `mockDraft` (`age: ""`).
    - `build-system-prompt.ts` (`buildCharacterBlock`) : `appendField(lines, "Âge", character.age)`
      (près de « Apparence »).
    - `build-draft-prompt.ts` : `age` ajouté au schéma (`properties` + `propertyOrdering` + `required`)
      et une consigne « champ par champ » : âge du personnage, **toujours un adulte majeur** (la
      génération IA remplit donc un âge adulte explicite).
    - `character-form.page.{ts,html}` : champ texte « Âge » (chargé/enregistré ; vidé par `resetForm`).
  - **Champ âge — persona** :
    - `persona-service.ts` : `age?: string` sur `Persona` ; paramètre `age` ajouté à `create(...)`.
    - `build-system-prompt.ts` (`buildPersonaBlock`) : ligne d'âge si renseigné (ex. « L'utilisateur
      est âgé de … »).
    - `persona-form.page.{ts,html}` : champ texte « Âge (facultatif) » (chargé/enregistré).
    - `characters.page.{ts,html}` : ajouter le champ « Âge » à la modale de première connexion
      (`namePrompt.age`) et le transmettre dans `saveUserName()` lors de la mise à jour du persona par défaut.
- **Limites** : steering, **pas** un contournement — réduit le taux de blocage sans le supprimer ;
  se combine au retry du point 2. L'« âge apparent » de la consigne `appearance` (physique) coexiste
  avec ce champ âge canonique.

## 4 — `/personas` : bouton « + Nouveau persona » plaqué en bas 🟢

**Constat** : le bouton porte le libellé « + Nouveau » dans une `.personas-toolbar` (en ligne avec le
hint), au lieu d'être plaqué en bas pleine largeur comme `.characters-add` / `.conversations-add`.

- **Méthode** :
  - `personas.page.html` : sortir le bouton de la `.personas-toolbar` ; **laisser le hint seul en
    haut** ; placer `<button class="personas-add" …>+ Nouveau persona</button>` en **dernier enfant**
    de l'`ion-content`, libellé « **+ Nouveau persona** ».
  - `personas.page.scss` : aligner sur `/characters` —
    `ion-content.personas-content::part(scroll){ display:flex; flex-direction:column }` ;
    `.personas-list` → `margin-bottom: 12px` ; `.personas-add` en style plaqué bas pleine largeur
    (`margin: auto 12px 0; position: sticky; bottom: 0; z-index: 1; border-radius: 12px; padding: 14px;
    font-size: 16px;` …) ; retirer la mise en page `.personas-toolbar` devenue inutile.
- **Limites** : le `--padding-bottom` existant (`72px + safe-bottom`) cale le bouton au-dessus de la navbar.

## 5 — `/personas` : item entier cliquable (édition), suppression du crayon 🟢

**Constat** : ouvrir l'édition d'un persona passe par la petite icône crayon ; le reste de la carte
n'est pas cliquable. On généralise : toucher **toute la carte** ouvre l'édition (comme le crayon
aujourd'hui), on **retire le crayon**, et il ne reste que le bouton de suppression (sauf persona par
défaut, non supprimable).

- **Méthode** (`personas.page.html`) :
  - `.persona-item` : ajouter `(click)="goToEdit(persona)"` (carte cliquable).
  - Retirer le bouton `.persona-item-edit` (crayon).
  - Bouton suppression : ajouter `$event.stopPropagation()` avant `confirmRemove(persona)` pour qu'un
    clic sur la corbeille n'ouvre pas l'édition.
- **Méthode** (`personas.page.scss`) : `.persona-item` → `cursor: pointer;` ; retirer la règle
  `.persona-item-edit` devenue inutile.
- **Limites** : aucune donnée touchée (purement interaction/UI).

## 6 — Warning de build « localforage … is not ESM » 🟢

**Constat** : `npm run build` avertit que `localforage` (via `@ionic/storage`) est du CommonJS.

- **Méthode** (`angular.json`, cible `build > options`) : ajouter
  `"allowedCommonJsDependencies": ["localforage"]`.
- **Limites** : purement cosmétique ; aucun impact runtime.

## 7 — Bump de version 1.4.4 🟢

- `VersionHandlerService.appVersionDisplay` → « **1.4.4** » ; `appVersion` **inchangé** (4).
- `android/app/build.gradle` : `versionName` « **1.4.4** », `versionCode` 14 → **15**.
- Entrée **en tête** de `RELEASE_NOTES` : 1.4.4.
- Commit final nommé **`1.4.4`**.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Diagnostic réponses vides (log `finishReason`) | 🟡 | ✅ Fait |
| 2 | Patch réponses vides : retry ×3 + erreur si échec | 🟡 | ✅ Fait |
| 3 | Contenu « adulte » : disclaimer global + champ âge (perso & persona) | 🟡 | ✅ Fait |
| 4 | `/personas` : bouton « + Nouveau persona » plaqué bas | 🟢 | ✅ Fait |
| 5 | `/personas` : item cliquable (édition), retrait du crayon | 🟢 | ✅ Fait |
| 6 | Warning build `localforage` | 🟢 | ✅ Fait |
| 7 | Bump 1.4.4 | 🟢 | ✅ Fait |

---

## À valider après implémentation (recette)
- Réponse vide : `console.warn("[Gemini] réponse vide", …)` en console ; après échec des re-tirages,
  toast « contenu bloqué », **aucune** bulle vide ni message utilisateur résiduel, texte rendu au champ.
- `/character-form`, `/persona-form` et la modale de première connexion (`/characters`) : champ « Âge »
  présent, enregistré et rechargé ; transmis au prompt (visible indirectement via le comportement de l'IA).
- Disclaimer « adulte » présent dans le prompt système (toujours).
- `/personas` : bouton « + Nouveau persona » pleine largeur, plaqué en bas (rendu comme `/characters`),
  marge correcte au-dessus du dernier persona quand la liste déborde.
- `npm run build` : plus de warning `localforage`.
