# TODO_v1_4_6 — Version 1.4.6 (illustration de scène : prompt généré par Gemini)

Mise à jour **mineure** : l'illustration de scène ne recopie plus le chat brut. On insère un
**pipeline IA-IA** — Gemini transforme le contexte en un **prompt visuel en anglais**, épuré
(SFW), envoyé ensuite à Cloudflare FLUX.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

## Décisions (tranchées avant rédaction)

- **Sortie structurée** : Gemini répond en JSON `{ imagePrompt: string }` (via `generateStructured`,
  comme la création de fiche), pour récupérer un prompt propre sans préambule.
- **Uniquement Gemini, aucun repli** (solution a) : le prompt image est **toujours** produit par
  Gemini. Si Gemini échoue (429 sur tous les modèles) **ou** renvoie un prompt vide (blocage),
  l'illustration **échoue proprement** (toast existant) — on **ne** fabrique **pas** de prompt
  déterministe. L'ancien `build-scene-image-prompt.ts` est **supprimé** (devenu mort).
- **Coût** : +1 requête **texte** (Gemini) par illustration, en plus de la requête **image**
  (Cloudflare). Comptabilisée via `usage.recordText`. Assumé (cf. direction A choisie).
- **Persona** : on transmet à Gemini la description du persona actif ; **Gemini décide** d'inclure
  {user} dans l'image uniquement s'il est présent dans la scène récente.
- `appVersion` **inchangé** (4, aucune donnée modifiée).

---

## 1 — Nouvelle util : instruction Gemini « scène → prompt image » 🟡

**Constat** : il faut un méta-prompt qui demande à Gemini de produire le prompt FLUX.

- **Méthode** : créer `src/app/utils/build-scene-image-instruction.ts` :
  - `buildSceneImageInstruction(character, persona, memory, recentMessages)` → chaîne (instruction
    en français adressée à Gemini). Contenu :
    - Rôle : « Tu produis un PROMPT pour un modèle text-to-image (FLUX), en **anglais**. »
    - À partir du contexte fourni, déterminer **qui / quoi / où** : personnages présents, action en
      cours, lieu, ambiance, cadrage.
    - **Descriptions physiques** : utiliser celles fournies (personnage principal ; persona actif si
      {user} est dans la scène) ; à défaut, **inventer** une apparence plausible et cohérente (pas de
      rendu générique). Ne décrire {user} **que** s'il apparaît dans la scène.
    - **Moment à illustrer (précision)** : illustrer l'**instant présent = l'état du DERNIER message**.
      Le contexte antérieur ne sert qu'à comprendre la situation actuelle. Si un paramètre a changé au
      fil des messages (lieu, personnages présents, action, moment de la journée…), illustrer le
      **dernier** état (ex. : lieu A → lieu B ⇒ illustrer B). Vaut pour le lieu **et tous** les autres
      paramètres.
    - **Format de sortie** : mots-clés / courtes phrases descriptives **visuelles**, en anglais ;
      **pas** de dialogue, pas de balises `*...*`, pas de noms-préfixes, pas de texte à afficher.
      Concis (~60–80 mots, bien < 2000 caractères).
    - **Épuration NSFW (critique)** : le service image est **très restrictif**. Produire une
      description **entièrement SFW**, sobre et non choquante : **aucun** terme explicite / sexuel /
      graphique / violent ne doit apparaître. Recadrer toute situation mature en une scène **suggérée
      et pudique** (ex. « two adults embracing » plutôt que toute description explicite). Tous les
      personnages sont des **adultes**.
  - `SCENE_IMAGE_SCHEMA = { type: "object", properties: { imagePrompt: { type: "string" } },
    required: ["imagePrompt"] }`.
- **Contexte transmis** : nom + apparence du personnage ; nom + genre + apparence du persona actif ;
  mémoire (lieu `location`, `situation`) ; derniers messages porteurs de texte (~8), pour situer
  l'action récente.
- **Limites** : `build-scene-image-prompt.ts` est **conservé** (repli).

## 2 — `ChatService.illustrateScene` : brancher le pipeline IA-IA 🟡

**Constat** : aujourd'hui `illustrateScene` appelle directement `buildSceneImagePrompt` (chat brut).

- **Méthode** (`chat-service.ts`) :
  - Récupérer le persona actif (`personaFor(conversation)`).
  - `result = gemini.generateStructured(buildSceneImageInstruction(character, persona, memory,
    messages), SCENE_IMAGE_SCHEMA)` ; `usage.recordText(result)` ; `prompt = result.data?.imagePrompt?.trim()`.
  - Si `prompt` vide (blocage / parsing raté) → **lever une erreur** (illustration échoue, toast).
  - Sinon `image.generate(prompt)` comme aujourd'hui (le reste inchangé : `recordImage`, gestion quota,
    ajout du message-image).
  - **Supprimer** `src/app/utils/build-scene-image-prompt.ts` et son import (plus de repli).
- **Limites** : si Gemini est épuisé (429) ou bloque le prompt, l'illustration échoue proprement
  (toast existant) — choix assumé (solution a).

## 3 — Bump de version 1.4.6 🟢

- `VersionHandlerService.appVersionDisplay` → « **1.4.6** » ; `appVersion` **inchangé** (4).
- `android/app/build.gradle` : `versionName` « **1.4.6** », `versionCode` 16 → **17**.
- Entrée **en tête** de `RELEASE_NOTES` : 1.4.6.
- Commit final nommé **`1.4.6`**.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Util `build-scene-image-instruction` (méta-prompt + schéma) | 🟡 | ✅ Fait |
| 2 | `illustrateScene` : pipeline IA-IA (Gemini uniquement) | 🟡 | ✅ Fait |
| 3 | Bump 1.4.6 | 🟢 | ✅ Fait |

---

## À valider après implémentation (recette)
- Illustrer une scène : l'image reflète **qui/quoi/où** (personnage + persona si présent + lieu +
  action), bien mieux qu'avant.
- Une scène mature donne une image **épurée** (pas de blocage Cloudflare systématique, pas de terme
  choquant dans le prompt).
- Gemini indisponible (pas de clé / 429 / blocage) : l'illustration échoue proprement (toast), pas de plantage.
- `npm run build`, tsc, lint OK.
