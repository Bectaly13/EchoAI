# TODO_v1_2_4 — Version 1.2.4 (correctif mémoire + UI)

Mise à jour **mineure** : corriger le comportement des **jalons** (l'IA les fusionne en un seul au lieu de les empiler) et un petit espacement dans `/memory`.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

> **✅ Statut : tous les points (1 à 3) sont implémentés, version passée en 1.2.4.** À valider en recette : empilement correct des jalons sur une vraie conversation.

---

## 1 — Jalons : empilés à l'identique, jamais fusionnés/reformulés 🟡

**Constat** (conversation test) : l'IA fusionne **tous** les jalons en **une seule** entrée de la forme « Jalon 1 ; Jalon 2 ; Jalon 3 » → jalon géant + **légère perte d'information** (reformulation à chaque tour). Or les jalons doivent s'**ajouter les uns à la suite des autres**, **sans être édités ni supprimés**.

- **Règle voulue** : un jalon = **une ligne = un événement**. On **recopie à l'identique** les jalons existants et on **ajoute** les nouveaux en dessous. **Jamais** combiner plusieurs événements sur une même ligne, **jamais** reformuler un jalon existant.
- **Seule exception** où un jalon préexistant peut changer : la **condensation des plus anciens** quand la limite (> 30) est atteinte.
- **Méthode** (`build-system-prompt.ts`, `buildMemoryInstructionBlock`) : réécrire les consignes `milestone` pour :
  - imposer **une ligne par événement** (interdire « A ; B ; C » sur une ligne) ;
  - imposer de **reproduire mot pour mot** les jalons déjà présents (pas de reformulation) ;
  - ajouter les nouveaux faits marquants en **nouvelles lignes** ;
  - ne pas réintroduire un doublon, mais **ne pas fusionner** des jalons distincts ;
  - **ne jamais supprimer** ; condensation des plus anciens **uniquement** au-delà de 30.
- **Limite** : repose sur le suivi du modèle (approche A : réémission complète) ; à vérifier en recette.

## 2 — /memory : marge basse du bouton « Tout oublier » 🟢

**Constat** : `.memory-clear` a `margin: 8px 16px 24px` ; le `24px` du bas **double** l'espace déjà fourni par le `--padding-bottom` de l'`ion-content` (l'inner-scroll).

- **Méthode** : `.memory-clear` → `margin: 8px 16px 0` (le bas vient du `--padding-bottom`).

## 3 — Bump de version 1.2.4 🟢 ✅ Fait

- `VersionHandlerService.appVersionDisplay` → « **1.2.4** ».
- `android/app/build.gradle` : `versionName` « **1.2.4** », `versionCode` 7 → **8**.
- `appVersion` (format bdd) **inchangé**.
- Entrée **en tête** de `RELEASE_NOTES` : 1.2.4 (jalons empilés correctement, petit ajustement d'affichage mémoire).
- Commit final nommé **`1.2.4`**.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Jalons : empilés à l'identique, jamais fusionnés/reformulés (prompt) | 🟡 | ✅ Fait |
| 2 | /memory : marge basse du bouton « Tout oublier » | 🟢 | ✅ Fait |
| 3 | Bump 1.2.4 | 🟢 | ✅ Fait |

---

## À valider après implémentation (recette)
- Les jalons s'**empilent** (plusieurs lignes distinctes), ne fusionnent plus en une seule entrée géante.
- Les jalons existants restent **identiques** au fil des tours (pas de reformulation).
- `/memory` : espace bas du bouton « Tout oublier » correct (pas de vide excessif).
