# TODO_v1_4 — Version 1.4 (fiches personnage)

Mise à jour **moyenne**, centrée sur les fiches personnage (`/character-form`) : balises dynamiques `{char}`/`{user}`, nouveaux champs (scénario, univers/cadre, façon de parler, histoire/passé), et amélioration de la génération par IA (apparence physique, personnages secondaires nommés).

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

> **✅ Statut : tous les points (1 à 4) sont implémentés, version passée en 1.4.** À valider en recette (cf. fin de document) : balises, qualité du draft (apparence/secondaires/scénario), prise en compte des nouveaux champs.

## Décisions (tranchées avant rédaction)

1. **Balises** : remplacement **in-app** de `{char}` (→ nom du personnage) et `{user}` (→ nom du persona actif), **insensible à la casse** (espaces tolérés : `{ char }`). On interpole **la chaîne finale du prompt système** (exhaustif : personnalité, scénario, apparence, persona… ; le code généré ne contient jamais de balise) et **la salutation au moment où elle devient le premier message**. Gemini ne voit jamais les balises, seulement des noms — ce qui satisfait « remplacé dans la salutation » **et** « compris dans les autres champs ».
2. **Limite balises** : la salutation est figée avec le persona du moment de sa matérialisation ; changer de persona ensuite ne réécrit pas le premier message déjà posé.
3. **Nouveaux champs** (tous **optionnels**) : `scenario` (intrigue de départ), `setting` (univers/cadre), `speechStyle` (façon de parler/voix), `background` (histoire/passé).
4. **Pas de migration bdd** : champs optionnels (comme `appearance`) → `appVersion` **inchangé** (3).
5. **Draft & scénario** : la génération IA **propose toujours** un scénario cohérent avec le brouillon (effaçable par l'utilisateur). Les autres nouveaux champs ne sont remplis que si le brouillon le permet (chaîne vide sinon).
6. **Draft & balises** : le draft émet `{char}` (au lieu du nom en dur) et `{user}` (quand un personnage nomme l'utilisateur) dans les champs générés ; le **nom réel** ne va que dans le champ `name`. La narration continue de désigner l'utilisateur par « tu ».

---

## 1 — Nouveaux champs : modèle de données, formulaire, prompt système 🟡

- **`character-service.ts`** : ajouter à `Character` (et à `CharacterDraft`) les champs optionnels `scenario?`, `setting?`, `speechStyle?`, `background?`. Mettre à jour `normalizeDraft` et `mockDraft`.
- **`character-form.page.ts`** : propriétés + pré-remplissage (`loadIfEditing`, `generateDraft`) + envoi (`save`) pour les 4 champs.
- **`character-form.page.html`** : 4 nouveaux `<textarea>` dans la section « Détails (optionnels) ». Ordre proposé : **Scénario**, **Univers / cadre**, **Façon de parler**, Apparence, **Histoire / passé**, Relation initiale, Goûts, Ce qu'il n'aime pas, Personnages qu'il connaît.
- **`build-system-prompt.ts`** (`buildCharacterBlock`) : injecter les champs renseignés avec des libellés clairs. Ordre : personnalité → « Façon de parler » → « Apparence » → « Histoire / passé » → « Univers / cadre » → « Scénario / intrigue » → relation initiale → goûts → n'aime pas → connaît.
- **Limite** : champs optionnels → anciens personnages non impactés (traités comme vides via `?? ""`).

## 2 — Balises {char} / {user} : interpolation 🟡

- **`utils/interpolate-tags.ts`** (nouveau, fonction pure) : `interpolateTags(text, char, user)` remplace `{char}` / `{user}` (regex insensible à la casse, espaces internes tolérés) par les noms fournis.
- **`build-system-prompt.ts`** : à la fin de `buildSystemPrompt`, interpoler la chaîne finale → `char = character.name`, `user = persona?.name || "l'utilisateur"`. Comme `buildPrompt` est rappelé à chaque tour (`send`/`regenerate`/`skipTurn`), `{user}` suit dynamiquement le persona actif.
- **`chat-service.ts`** : interpoler la **salutation** quand elle devient le premier message (création de conversation **et** réinitialisation), avec le nom du personnage et celui du persona du moment (défaut à la création). Méthode privée dédiée pour ne pas dupliquer.
- **Limite** : voir décision §2 (salutation figée).

## 3 — Draft prompt : balises, scénario, apparence physique, personnages secondaires 🟡

Réécrire `utils/build-draft-prompt.ts` (`buildDraftPrompt` + `CHARACTER_DRAFT_SCHEMA`) :

- **Schéma** : ajouter `scenario`, `setting`, `speechStyle`, `background` aux `properties` et à `propertyOrdering` ; ajouter `scenario` aux `required` (toujours proposé, cf. §5).
- **Balises** : consigne d'utiliser `{char}` partout où le personnage est nommé (dialogues : `{char} : "…"`, et références dans les champs), et `{user}` quand un personnage s'adresse à l'utilisateur par son nom ; le nom réel ne va que dans `name`.
- **Apparence** : consigne explicite — décrire d'abord le **physique** (couleur de cheveux et d'yeux, taille, corpulence, traits, âge apparent…) ; les vêtements/accessoires sont secondaires, l'attitude ne relève pas de ce champ.
- **Personnages secondaires** (`knownCharacters`) : exiger une **liste nommée** — pour chacun : **nom + fonction + relation au personnage** (ex. « - Lana, meilleure amie » / « - Mme Dubois, prof de chimie »). Interdire les ensembles génériques non nommés (« les autres élèves, les professeurs »), qui ne fondent pas un socle stable (risque de renommage entre deux points éloignés de l'histoire).
- **Nouveaux champs** : `scenario` (intrigue de départ, toujours proposée), `setting` (univers/cadre), `speechStyle` (registre, tics, ton), `background` (passé) — remplis si le brouillon le permet, sinon vides (sauf `scenario`).

## 4 — Bump de version 1.4 🟢

- `VersionHandlerService.appVersionDisplay` → « **1.4** ».
- `android/app/build.gradle` : `versionName` « **1.4** », `versionCode` 10 → **11**.
- `appVersion` (format bdd) **inchangé** (3) — pas de migration.
- Entrée **en tête** de `RELEASE_NOTES` : 1.4.
- Commit final nommé **`1.4`**.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Nouveaux champs : données + formulaire + prompt système | 🟡 | ✅ Fait |
| 2 | Balises {char} / {user} : interpolation | 🟡 | ✅ Fait |
| 3 | Draft prompt : balises, scénario, apparence physique, perso secondaires nommés | 🟡 | ✅ Fait |
| 4 | Bump 1.4 | 🟢 | ✅ Fait |

---

## À valider après implémentation (recette)
- Renommer un personnage (champ « nom ») : tout ce qui utilisait `{char}` suit, sans retoucher les autres champs.
- `{user}` dans la salutation : remplacé par le nom du persona actif ; `{user}` dans personnalité/scénario : l'IA comprend qu'il s'agit de l'utilisateur.
- Fiche générée par IA : apparence centrée sur le physique ; personnages secondaires listés avec nom + fonction + relation ; un scénario est proposé.
- Les 4 nouveaux champs sont bien pris en compte par l'IA en conversation.
