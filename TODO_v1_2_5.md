# TODO_v1_2_5 — Version 1.2.5 (jalons en delta + persona + saisie)

Mise à jour **mineure** : refonte de l'ajout des **jalons** (passage en *delta* append-only,
pour de bon), champ **apparence** sur les personas, et **zone de saisie** du chat multilignes
sans bouton « Envoyer ».

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

> **✅ Statut : tous les points (1 à 4) sont implémentés, version passée en 1.2.5.** À valider en recette : empilement des jalons en delta sur une vraie conversation, prise en compte de l'apparence, comportement du champ de saisie multilignes.

> **Décisions tranchées avant implémentation :**
> - Jalons en **delta** : à chaque message, Gemini émet **uniquement** le(s) nouveau(x) jalon(s)
>   atteint(s) ce tour (ou aucun) ; l'app les **ajoute** aux existants. Le modèle ne réémet plus
>   le journal → fini la fusion « A ; B ; C ». On **suspend totalement la condensation** (>30) et
>   on **autorise l'accumulation** (les jalons proposés sont déjà pertinents et peu nombreux).
>   On ne touche **pas** à la *détection* (le modèle propose les bons jalons), seulement à la
>   *façon de les ajouter*.
> - Pas de migration bdd : les jalons restent des `MemoryEntry { category: "milestone" }` ;
>   le champ `appearance` du persona est facultatif (comme `gender`). `appVersion` **inchangé**.

---

## 1 — Jalons en delta (append-only), plus de fusion 🔴

**Constat** : malgré deux durcissements du prompt (1.2.1, 1.2.4), Gemini fusionne les jalons en
une seule entrée « Jalon 1 ; Jalon 2 ; Jalon 3 ». Cause racine : l'approche A demande au modèle de
**recopier tout le journal** à chaque tour, ce qu'il finit toujours par compacter.

- **Principe** : seul le **milestone** passe en delta ; les autres catégories (`location`,
  `situation`, `relationship`, `instruction`) **restent en approche A** (réémission complète +
  remplacement).
- **Prompt** (`build-system-prompt.ts`, `buildMemoryInstructionBlock`) : réécrire la section
  `milestone` :
  - « N'émets QUE le(s) nouveau(x) jalon(s) atteint(s) durant CE tour, un par ligne. »
  - « Ne réémets PAS les jalons déjà présents dans le journal ci-dessus : l'application les
    conserve automatiquement. »
  - « Si aucun fait vraiment marquant n'a eu lieu ce tour, n'émets AUCUNE ligne `milestone`. »
  - Conserver : un seul événement par ligne, faits **vraiment marquants** seulement (pas un jalon
    par message), pas de doublon d'un jalon déjà au journal.
  - **Retirer** toute la consigne de condensation (>30) — suspendue.
- **Orchestration** (`chat-service.ts`, `appendModelReply`) : quand `hasMemoryBlock` :
  - catégories ≠ `milestone` → **remplacent** l'existant (comme aujourd'hui) ;
  - `milestone` → on **conserve** les jalons existants et on **ajoute** les nouveaux émis ce tour
    (garde anti-doublon : on n'ajoute pas une valeur déjà présente à l'identique).
- **Limite (recette)** : à la **régénération** d'un message, le jalon éventuel du message écarté
  n'est pas « rembobiné » (on ne trace pas la source d'un jalon) → il peut subsister. Accepté pour
  l'instant (les jalons sont rares ; accumulation tolérée).

## 2 — Champ « apparence » du persona 🟡

**But** : l'utilisateur peut décrire son apparence physique (pour la cohérence long terme et
l'immersion). Facultatif.

- **`persona-service.ts`** : ajouter `appearance?: string` à `Persona` ; le passer dans `create()`
  et `update()` (via `changes`).
- **`persona-form`** : champ `appearance` (textarea facultatif) sous la description, masqué pour le
  persona par défaut comme l'est la description.
- **`build-system-prompt.ts`** (`buildPersonaBlock`) : si renseigné, ajouter une ligne
  « L'utilisateur a l'apparence suivante : « … » » (cadrée comme la description).
- **Limite** : champ optionnel → aucun impact sur les anciens personas (traité comme vide).

## 3 — Saisie multilignes + suppression du bouton « Envoyer » 🟡

**Constat** : `<input type="text">` ne revient pas à la ligne (scroll horizontal, début du message
hors écran). Le bouton « Envoyer » empêche d'agrandir proprement le champ en hauteur.

- **`chat.page.html`** : remplacer l'`<input>` par un `<textarea>` (rows=1) qui prend toute la
  largeur du footer ; **supprimer** le bouton `.chat-send`.
  - Entrée envoie le message (`(keydown.enter)` → `preventDefault` + `send()`), comme le bouton
    « Entrée » du clavier Android. Maj+Entrée insère un saut de ligne (non géré par
    `keydown.enter`).
- **`chat.page.ts`** : `@ViewChild` du textarea ; `autoGrowDraft()` (ajuste la hauteur au contenu)
  sur `(input)` ; remise à zéro de la hauteur après envoi.
- **`chat.page.scss`** : `.chat-input` → `resize: none`, `max-height` ≈ 3 lignes, `overflow-y: auto` ;
  retirer `.chat-send` / `.chat-send[disabled]`.
- **Limite** : sur mobile, pas de saut de ligne manuel (pas de Maj) — le retour à la ligne est
  **visuel** (word-wrap), ce qui est l'objectif.

## 4 — Bump de version 1.2.5 🟢

- `VersionHandlerService.appVersionDisplay` → « **1.2.5** ».
- `android/app/build.gradle` : `versionName` « **1.2.5** », `versionCode` 8 → **9**.
- `appVersion` (format bdd) **inchangé** (3).
- Entrée **en tête** de `RELEASE_NOTES` : 1.2.5.
- Commit final nommé **`1.2.5`**.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Jalons en delta (append-only), plus de fusion | 🔴 | ✅ Fait |
| 2 | Champ « apparence » du persona | 🟡 | ✅ Fait |
| 3 | Saisie multilignes + suppression du bouton « Envoyer » | 🟡 | ✅ Fait |
| 4 | Bump 1.2.5 | 🟢 | ✅ Fait |

---

## À valider après implémentation (recette)
- Les jalons s'**ajoutent** un par un et ne fusionnent plus ; le journal grandit proprement.
- Un tour sans fait marquant **n'ajoute aucun** jalon.
- Apparence du persona prise en compte par l'IA dans la durée.
- Champ de saisie : le texte revient à la ligne, s'étire jusqu'à 3 lignes puis scrolle ; l'envoi
  par la touche Entrée du clavier fonctionne sans bouton « Envoyer ».
