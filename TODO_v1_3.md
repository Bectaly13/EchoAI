# TODO_v1_3 — Version 1.3 (rembobinage fidèle des jalons)

Mise à jour **moyenne**. Les jalons sont en *delta append-only* depuis la 1.2.5 (le modèle n'émet que le nouveau jalon du tour, l'app l'empile, rien n'est jamais réémis). Conséquence : contrairement aux autres catégories (réémises et remplacées à chaque tour, donc auto-cohérentes), **les jalons ne se rembobinent pas** quand on supprime des messages ou qu'on régénère. Cette version ajoute la **provenance** (chaque jalon retient le message qui l'a produit) et le **rembobinage fidèle** qui en découle.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

> **✅ Statut : tous les points (1 à 4) sont implémentés, version passée en 1.3.** À valider en recette (cf. fin de document) : rembobinage à la suppression et à la régénération, protection des jalons manuels.

## Décisions (tranchées avant rédaction)

1. **Périmètre** : le *delta append-only* est **déjà acquis** (1.2.5). La 1.3 bâtit par-dessus — provenance + rembobinage. On ne retouche **pas** le prompt : la provenance est purement interne (côté app).
2. **Provenance limitée aux jalons** : `sourceMessageId` n'est pertinent que pour `milestone`. Les autres catégories (`location`, `situation`, `relationship`, `instruction`) restent en réémission/remplacement et se rembobinent déjà toutes seules — inutile de les tracer.
3. **Pas de migration bdd** → `appVersion` **inchangé** (3) : `sourceMessageId` est optionnel ; les jalons existants ne l'ont pas et restent simplement non-rembobinables.
4. **Jalons sans source** (ajoutés à la main via 🧠, ou antérieurs à la 1.3) → **jamais retirés automatiquement** : faute de provenance, on les conserve (comme les entrées `manual` l'étaient avant la 1.2). Une alternative — ancrer le jalon manuel au dernier message du modèle — a été envisagée puis écartée (cf. « Alternative écartée » en fin de document).
5. **Suppression = mécanique** : un jalon issu d'un message supprimé est retiré, même si l'événement « resterait vrai ». Juger sa pertinence demanderait au modèle un raisonnement sémantique — précisément ce qu'on a écarté pour les jalons. L'info de lieu/situation reste portée par `location`/`situation` (approche A), donc rien d'essentiel n'est perdu.
6. **Régénération** : on **retire** le(s) jalon(s) de la réponse régénérée (la réponse est remplacée, son jalon aussi ; la nouvelle réponse pourra en reproposer). Évite les jalons orphelins et les doublons.
7. **Condensation > 30** : **reste suspendue** (hors-scope 1.3). L'accumulation reste libre ; la fusion d'anciens jalons casserait leur rattachement, sujet à traiter séparément.

---

## 1 — Provenance : rattacher chaque jalon à son message 🟡

**Constat** : `MemoryEntry = { id, category, value, at }` ne dit pas de quel message vient un jalon → impossible de savoir lequel retirer à la suppression.

- **Méthode** (`chat-service.ts`) :
  - Ajouter `sourceMessageId?: string` à `MemoryEntry`, documenté : rempli **uniquement** pour les jalons issus d'une réponse du modèle ; absent pour les jalons manuels et pour les catégories en approche A.
  - `appendModelReply` : capturer l'`id` du message modèle qu'on crée, et le passer aux nouveaux jalons. `toMemoryEntry(category, value, sourceMessageId?)` ; les entrées non-`milestone` (branche `replaced`) sont créées **sans** source.
  - `addMemoryEntry` (écran 🧠) : inchangé → jalon manuel **sans** `sourceMessageId` (donc protégé du rembobinage).
- **Limite** : un tour peut produire plusieurs jalons → tous rattachés au **même** message (cohérent : ils disparaissent ensemble si ce message est supprimé).

## 2 — Rembobinage à la suppression de messages 🟡

**Constat** : `deleteFrom` tronque les messages mais laisse la mémoire intacte → des jalons rattachés à des messages disparus subsistent.

- **Méthode** (`chat-service.ts`, `deleteFrom`) :
  - Avant de tronquer, collecter les `id` de **tous** les messages retirés (le `splice(index)` **et** les messages `user` retirés ensuite en fin de liste).
  - Nouvelle méthode privée `forgetMilestonesFrom(conversation, removedIds)` : retire de `conversation.memory` les entrées telles que `category === "milestone" && sourceMessageId && removedIds.has(sourceMessageId)`. Tout le reste (autres catégories, jalons sans source) est conservé.
- **Limite** : voir décision §5 (suppression mécanique).

## 3 — Rembobinage à la régénération 🟢

**Constat** : `regenerate` retire (`pop`) la dernière réponse du modèle puis en génère une nouvelle ; le jalon de l'ancienne réponse reste rattaché à un message qui n'existe plus.

- **Méthode** (`chat-service.ts`, `regenerate`) : avant/au moment du `pop`, réutiliser `forgetMilestonesFrom(conversation, new Set([last.id]))` pour retirer le(s) jalon(s) de la réponse écartée. La régénération recrée ensuite un message (nouvel `id`) via `appendModelReply`, qui rattache les nouveaux jalons à ce nouveau message → pas d'orphelin.
- **Limite** : si la nouvelle réponse ne repropose pas le jalon, il disparaît — comportement voulu (décision §6).

## 4 — Bump de version 1.3 🟢

- `VersionHandlerService.appVersionDisplay` → « **1.3** ».
- `android/app/build.gradle` : `versionName` « **1.3** », `versionCode` 9 → **10**.
- `appVersion` (format bdd) **inchangé** (3) — pas de migration.
- Entrée **en tête** de `RELEASE_NOTES` : 1.3.
- Commit final nommé **`1.3`**.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Provenance : rattacher chaque jalon à son message | 🟡 | ✅ Fait |
| 2 | Rembobinage à la suppression de messages | 🟡 | ✅ Fait |
| 3 | Rembobinage à la régénération | 🟢 | ✅ Fait |
| 4 | Bump 1.3 | 🟢 | ✅ Fait |

---

## À valider après implémentation (recette)
- Supprimer une section de conversation retire bien les jalons nés dans cette section, et **seulement** ceux-là.
- Les jalons ajoutés à la main (🧠) survivent à toute suppression.
- Régénérer une réponse qui avait posé un jalon le retire ; la nouvelle réponse peut en reposer un (pas de doublon, pas d'orphelin).
- Les jalons créés avant la 1.3 (sans provenance) ne sont jamais retirés automatiquement (conservés).

---

## Alternative écartée — ancrer les jalons manuels à un message (trace de décision)

**Idée envisagée** : au lieu de laisser les jalons manuels sans provenance, leur attribuer automatiquement le `sourceMessageId` du **dernier message du modèle** au moment de l'ajout (trivial à récupérer dans `addMemoryEntry`). Objectif : un lien jalon↔message **pour tous** les jalons, donc une mécanique de rembobinage uniforme, sans cas particulier « jalon sans source ».

**Pourquoi écartée** : un ajout manuel est, en pratique (~99 % des cas), un **rattrapage tardif** — on corrige la mémoire en se rendant compte que l'IA a oublié de consigner un événement survenu plusieurs messages plus tôt (personne ne relit la mémoire permanente après *chaque* message). L'événement décrit est donc presque toujours **antérieur** au dernier message ; l'ancrer au présent est temporellement faux. Conséquence concrète : si on tronque ensuite la section contenant ce dernier message, le jalon manuel disparaîtrait alors que l'événement qu'il décrit est toujours dans l'historique → **moins** fidèle que de le conserver.

**Ce qu'on retient** : « jalon sans source = jamais rembobiné automatiquement » n'est pas un trou dans la mécanique mais une **règle nette et défendable** — *ce que l'utilisateur pose à la main, il le retire à la main*. Le rembobinage automatique ne concerne que les jalons produits par l'IA (faillible, donc rembobinable) ; les jalons délibérément posés par l'utilisateur restent sous son contrôle via le même écran 🧠. Le coût de l'exception se limite à un `&& sourceMessageId` dans le filtre.
