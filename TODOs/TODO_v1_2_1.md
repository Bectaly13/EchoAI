# TODO_v1_2_1 — Version 1.2.1 (correctif mémoire : jalons & situation)

Mise à jour **mineure**, correctif de la mémoire permanente. Depuis la 1.2, plus de doublons — mais les **critères d'obsolescence** sont mauvais : le modèle applique « retire ce qui est dépassé » **aussi aux jalons**, qu'il traite alors comme un état roulant (« où en est l'histoire ? ») au lieu d'un **journal d'événements**. Résultat : la section *Jalons* se réduit souvent à **une seule entrée** réécrite.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

> **✅ Statut : tous les points (1 à 3) sont implémentés, version passée en 1.2.1.** À valider en recette (cf. fin de document) : accumulation correcte des jalons et pertinence de la « situation actuelle ».

---

## Diagnostic

- **Un jalon est un fait passé → jamais obsolète** par définition. Seules opérations légitimes : fusionner de vrais doublons, ou regrouper d'anciens jalons en un jalon synthétique **sans perdre d'information**. Jamais « supprimer car dépassé ».
- L'obsolescence ne concerne que les catégories d'**état courant** : `location`, `relationship`, et la nouvelle `situation`. (`instruction` : retirée seulement si explicitement révoquée/contredite.)
- Le modèle détourne les jalons pour stocker « où en est l'histoire ». → On lui **donne ce slot** explicitement via une catégorie `situation` (valeur unique), distincte des jalons (événements).
- **Journal intégral** confirmé : on ne perd jamais un événement. **Condensation** seulement **au-delà de 30 jalons**, et par **fusion** (regroupement synthétique), pas par suppression.
- **Critère d'un jalon = fait marquant**, pas « 1 message = 1 jalon » (sinon on atteint le seuil de condensation très vite). Jugement **sémantique**.

## Décisions (tranchées)

1. Jalons = **journal cumulatif intégral** (jamais obsolètes).
2. **Condensation à partir de 30 jalons** : fusionner les plus anciens en jalons synthétiques, **sans perte d'information**.
3. Insister sur le **caractère marquant** d'un jalon (pas chaque message).
4. **Ajout d'une catégorie `situation`** (valeur unique) : « où en est l'histoire maintenant ».
5. Pas de migration (`appVersion` inchangé) : ajout de catégorie **purement additif**.

---

## 1 — Règles d'obsolescence par catégorie (prompt) 🟡

Réécrire `buildMemoryInstructionBlock` (`utils/build-system-prompt.ts`) pour **différencier les catégories** au lieu d'une règle « retire l'obsolète » globale.

- **`location` / `relationship` / `situation`** = **état courant** → une seule valeur, **mise à jour/remplacée** quand elle évolue (l'obsolescence s'applique ici).
- **`milestone`** = **journal cumulatif d'événements** :
  - On **n'enlève JAMAIS** un fait passé (un jalon n'est pas « dépassé » : il s'est produit).
  - On **ajoute** les nouveaux **faits marquants** (décision, rencontre, révélation, bascule de relation, objectif/lieu atteint…). **Pas** un jalon par message : seulement ce qui compte vraiment.
  - On **fusionne** uniquement les vrais doublons (déjà couvert).
  - **Condensation** : **si plus de 30 jalons**, regrouper les plus anciens en jalons synthétiques (résumé fidèle), **sans perdre d'information** — jamais de simple suppression.
- **`instruction`** = durable → retirée **seulement** si explicitement révoquée ou contredite.
- **Toutes les valeurs en français** (rappel).
- Mettre à jour le **gabarit** du bloc `[[MEMORY]]` (ajout de la ligne `situation:`) et le **libellé de lecture** `buildMemoryBlock`.
- **Limite** : tout repose sur le jugement sémantique du modèle ; à surveiller en recette.

## 2 — Nouvelle catégorie `situation` (valeur unique) 🟢

« Situation actuelle » = où en est l'histoire (état en cours), distinct du **dernier jalon** (événement).

- **`utils/parse-memory.ts`** : ajouter `"situation"` au type `MemoryCategory` et au tableau `CATEGORIES`.
- **`utils/build-system-prompt.ts`** : `buildMemoryBlock` affiche la situation comme **valeur unique** (via `latestValue`, comme lieu/relation) ; ajouter la ligne `situation:` au gabarit du bloc (#1).
- **`pages/memory/`** : ajouter `{ category: "situation", label: "Situation actuelle" }` à la liste `categories` (ordre proposé : Lieu, Situation, Relation, Jalons, Consignes). Catégorie à **valeur unique → non repliable** (`collapsibleCategories` reste `["milestone", "instruction"]`).
- **Additif** : aucune migration ; les anciennes mémoires n'ont simplement pas d'entrée `situation`.

## 3 — Bump de version 1.2.1 🟢 ✅ Fait

- ✅ `VersionHandlerService.appVersionDisplay` → « **1.2.1** ».
- ✅ `android/app/build.gradle` : `versionName` « **1.2.1** », `versionCode` → **5**.
- ✅ `appVersion` (format bdd) **inchangé**.
- ✅ Entrée **en tête** de `RELEASE_NOTES` : 1.2.1.
- Commit final nommé **`1.2.1`**.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Règles d'obsolescence par catégorie (jalons cumulatifs + condensation à 30 + « marquant ») | 🟡 | ✅ Fait |
| 2 | Nouvelle catégorie `situation` (valeur unique) | 🟢 | ✅ Fait |
| 3 | Bump 1.2.1 (appVersionDisplay + versionName/versionCode + release notes) | 🟢 | ✅ Fait |

---

## À valider après implémentation (recette)
- Les **jalons s'accumulent** (plusieurs entrées qui racontent le fil), ne se réduisent plus à une seule.
- Seuls les **faits marquants** deviennent des jalons (pas chaque message).
- La **situation actuelle** apparaît et évolue (état courant), distincte des jalons.
- Lieu / relation / situation se **mettent à jour** ; instructions stables sauf révocation.
- Au-delà de ~30 jalons, les plus anciens sont **fusionnés/résumés** sans perte d'information.
