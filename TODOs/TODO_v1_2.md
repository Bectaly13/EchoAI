# TODO_v1_2 — Version 1.2 (mémoire permanente)

Mise à jour **moyenne**, centrée sur la **mémoire permanente**. Depuis la 1.1, la mémoire s'écrit trop et accumule des **doublons** (égalité stricte de chaîne **ou** équivalence sémantique), et on a vu des écritures **en anglais**. On change de mécanisme : le modèle réémet l'**état complet consolidé** de la mémoire à chaque tour (au lieu d'ajouts incrémentaux), et c'est lui qui fusionne les équivalents et retire l'obsolète.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

> **✅ Statut : tous les points (1 à 7) sont implémentés et la version est passée en 1.2.** À valider en recette (cf. fin de document) : qualité de la consolidation mémoire sur une longue conversation.

---

## Contexte (mécanisme actuel, à remplacer)

- Le modèle émet un bloc `[[MEMORY]]` de **deltas** (lignes `location` / `relationship` / `milestone` / `instruction`).
- `ChatService.applyMemoryUpdates` : `location`/`relationship` à **valeur unique** (remplacement) ; `milestone`/`instruction` en **listes** avec anti-doublon par **égalité stricte** (`sameMemoryValue` = `trim().toLowerCase()`) et plafond `MAX_LIST_ENTRIES = 30`.
- Chaque entrée porte un `sourceMessageId` servant au **rollback** (régénération / suppression) ; les entrées `manual` en sont exemptées.
- **Problèmes** : dédup purement strict (équivalents sémantiques non détectés), aucune purge de l'obsolète, langue non contrainte.

## Décisions (tranchées)

1. **Mécanisme A** : le modèle réémet la **mémoire complète consolidée** à chaque tour → on **remplace** la mémoire stockée. La fusion (y compris sémantique) et la purge de l'obsolète sont **le travail du modèle**.
2. **On garde les 4 catégories** (dont `milestone`) : le souci était le doublon, pas la quantité.
3. **Rollback simplifié (option b)** : la régénération reste correcte (le nouveau message réémet une mémoire propre) ; la **suppression de message ne rembobine plus** la mémoire ; les corrections passent par l'écran 🧠.
4. **Français** imposé pour les valeurs.
5. **Pas de migration** (`appVersion` inchangé) : la forme stockée reste une liste d'entrées ; le champ `sourceMessageId` devenu inutile est simplement ignoré sur l'existant.

---

## 1 — Prompt mémoire « état complet consolidé » 🟡

Réécrire `buildMemoryInstructionBlock` (`utils/build-system-prompt.ts`) : au lieu de demander des **ajouts**, demander au modèle de **réémettre l'intégralité de la mémoire à jour** en fin de réponse.

- **Méthode / contenu de la consigne** :
  - À la fin de **chaque** réponse, si la mémoire contient quelque chose (ou s'il y a quelque chose à retenir), réémettre le bloc `[[MEMORY]]…[[/MEMORY]]` **complet** : la mémoire telle qu'elle doit être **après** ce tour.
  - **Fusionner** les éléments équivalents (même sens, même si formulés différemment) → **un seul** par idée.
  - **Retirer** ce qui est devenu **faux, dépassé ou contredit** par la suite de l'histoire.
  - `location` / `relationship` : **une seule** valeur courante chacun.
  - `milestone` / `instruction` : **toutes** les entrées encore pertinentes, une par ligne (sans doublon). Si la liste de jalons devient longue, **fusionner/résumer** les plus anciens.
  - **Conserver** les entrées déjà présentes (y compris ajoutées par l'utilisateur) **sauf** si réellement obsolètes ou contredites.
  - **Toutes les valeurs en français.**
  - Ne jamais évoquer ce bloc dans la narration.
- Le bloc de **lecture** `buildMemoryBlock` (mémoire courante injectée dans le prompt) est conservé : c'est l'état que le modèle doit maintenir/réémettre. Clarifier son libellé en ce sens.
- **Limite** : en réémettant tout, le modèle peut **oublier** une entrée encore pertinente (risque inhérent à A) → consigne insistante « réémets la mémoire **complète** ».

## 2 — `parseMemory` : interpréter le bloc comme l'état complet 🟢

`utils/parse-memory.ts` : le bloc ne représente plus des deltas mais l'**état complet**.

- **Méthode** : exposer un indicateur **`hasMemoryBlock`** dans `ParsedMemory` (vrai si un bloc balisé **ou** des lignes récupérées par le repli sont présents). Garder le **repli tolérant** (#3b de la 1.1.1 : lignes nues en fin de message → récupérées et retirées de l'affichage). Renommer le résultat des lignes en conséquence (`entries` plutôt que `updates`).
- **Consommation** (cf. #3) : `hasMemoryBlock` vrai → la mémoire devient **exactement** ces entrées ; faux → mémoire **inchangée** (ne jamais vider la mémoire juste parce qu'un tour n'a pas réémis de bloc).

## 3 — `ChatService` : remplacer la mémoire + retirer l'ancienne machinerie 🟡

- **Remplacement** : dans `appendModelReply`, si `parsed.hasMemoryBlock`, **remplacer** `conversation.memory` par les entrées parsées (chacune recréée avec `id` + `at`). Sinon, ne pas toucher à la mémoire.
- **Suppressions de code** devenues inutiles : `applyMemoryUpdates`, `capMemory`, `sameMemoryValue`, `forgetMemoryFrom`, et les constantes `SINGLE_VALUED_CATEGORIES`, `MAX_LIST_ENTRIES`, `MANUAL_SOURCE`.
- **Régénération** (`regenerate`) : retirer l'appel à `forgetMemoryFrom` — le nouveau message réémettra une mémoire propre (option b : rien d'autre à faire).
- **Suppression** (`deleteFrom`) : retirer le filtrage de la mémoire par `sourceMessageId` (le bloc `remainingIds`/`filter`). On tronque les messages, **la mémoire reste telle quelle**.

## 4 — Éditions manuelles (écran 🧠) : simplifier 🟢

Sans `MANUAL_SOURCE` ni logique de merge :
- `addMemoryEntry` : ajoute simplement une entrée `{ id, category, value, at }`.
- `updateMemoryEntry` : modifie la valeur d'une entrée par `id`.
- `deleteMemoryEntry` / `clearMemory` : inchangés (filtre / vide).
- Les éditions sont visibles par le modèle (injectées via `buildMemoryBlock`) ; la consigne #1 lui demande de les **conserver** sauf obsolescence.
- **Limite** : entre deux tours, une édition manuelle d'une catégorie à valeur unique peut coexister avec l'ancienne ; l'affichage prend la plus récente et le modèle consolide au tour suivant.

## 5 — `MemoryEntry` : retirer `sourceMessageId` 🟢

- Retirer le champ `sourceMessageId` de l'interface `MemoryEntry` (`chat-service.ts`) et de sa documentation. Aucune migration : les entrées existantes le conservent en base, il est simplement ignoré.

## 6 — /memory : catégories repliables (jalons / consignes) 🟢

Dans `/memory/{id}`, les catégories à **valeurs multiples** (`milestone`, `instruction`) peuvent contenir beaucoup d'entrées → les rendre **repliables/dépliables** pour la lisibilité. **Pliées par défaut** à chaque chargement de la page.

- **Méthode** (`pages/memory/`) :
  - `MemoryGroup` : ajouter `category`, `collapsible` (vrai pour `milestone` / `instruction`) et `collapsed`.
  - `groupByCategory(memory, collapseAll)` : au **chargement** (`collapseAll = true`) les groupes multi-valeurs sont **pliés** ; lors d'une **édition/suppression** (`collapseAll = false`) on **conserve** l'état plié/déplié courant de chaque groupe (sinon les menus se replieraient à chaque action).
  - HTML : pour un groupe `collapsible`, le titre devient un **bouton** (chevron + nombre d'entrées) qui bascule `collapsed` ; les entrées ne s'affichent que si `!collapsed`. `location` / `relationship` (valeur unique) restent affichés normalement.
- **Limite** : purement visuel (ajout / édition / suppression d'entrées inchangés).

## 7 — Bump de version 1.2 🟢 ✅ Fait

- ✅ `VersionHandlerService.appVersionDisplay` → « **1.2** ».
- ✅ `android/app/build.gradle` : `versionName` « **1.2** », `versionCode` → **4**.
- ✅ `appVersion` (format bdd) **inchangé** (pas de migration).
- ✅ Entrée **en tête** de `RELEASE_NOTES` (`utils/release-notes.ts`) : 1.2.
- Commit final nommé **`1.2`**.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Prompt mémoire « état complet consolidé » (+ français) | 🟡 | ✅ Fait |
| 2 | `parseMemory` : bloc = état complet (`hasMemoryBlock`) | 🟢 | ✅ Fait |
| 3 | `ChatService` : remplacement + retrait machinerie dédup/rollback | 🟡 | ✅ Fait |
| 4 | Éditions manuelles simplifiées (sans `MANUAL_SOURCE`) | 🟢 | ✅ Fait |
| 5 | `MemoryEntry` : retirer `sourceMessageId` | 🟢 | ✅ Fait |
| 6 | /memory : jalons/consignes repliables (pliés par défaut) | 🟢 | ✅ Fait |
| 7 | Bump 1.2 (appVersionDisplay + versionName/versionCode + release notes) | 🟢 | ✅ Fait |

---

## À valider après implémentation (recette)
- Plus de doublons (stricts **et** sémantiques) dans la mémoire au fil d'une longue conversation.
- Plus d'écritures en anglais.
- L'obsolète disparaît (ex. changement de lieu, jalon contredit).
- Régénération : mémoire cohérente après coup. Suppression : mémoire **non** rembobinée (attendu). Éditions manuelles : conservées d'un tour à l'autre.
