# TODO_v1_4_7 — Version 1.4.7 (correctif illustration de scène)

Mise à jour **correctif** : le prompt d'illustration (généré par Gemini, cf. 1.4.6) était souvent
**refusé en entrée** par le filtre `PROHIBITED_CONTENT` de Google dès qu'un contexte était adulte.
Diagnostic : le blocage portait sur **l'input** (`promptFeedback.blockReason`, aucun `candidates`),
et notre **propre instruction** contenait des termes déclencheurs.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

## Décisions (tranchées après diagnostic)

- **Diagnostic confirmé en test** (navigateur) : `promptFeedback.blockReason: "PROHIBITED_CONTENT"`
  sans `candidates` → c'est l'**entrée** qui est filtrée, pas la sortie → un retry serait inutile
  (entrée identique = même blocage déterministe).
- **Solution retenue = B seul** : neutraliser le **vocabulaire de notre instruction** (qui nommait
  littéralement « sexuel / explicite / violent / mature / SFW »), reformulé en **positif**. Suffisant
  pour débloquer les contextes explicites.
- **Cas « hard » résiduel** : si Cloudflare (vérificateur d'**image**, 3ᵉ filtre, distinct) refuse le
  rendu, on **laisse l'erreur** plutôt que de dégrader la fidélité (choix utilisateur). Pas de
  neutralisation de composition (écartée car trop destructrice de fidélité).
- Code écrit **avant** le cadrage (mode test/itératif) → ce TODO est rédigé a posteriori.
- `appVersion` **inchangé** (4, aucune donnée modifiée).

---

## 1 — Neutraliser le vocabulaire de l'instruction image (B) 🟢 ✅

- **Méthode** (`build-scene-image-instruction.ts`) : section « Épuration » → renommée « Convenance »
  et reformulée **sans aucun terme déclencheur**. Formulation positive : « images tout public »,
  « convenable », « de bon goût », « suggéré et pudique », « tenues correctes et poses décentes »,
  priorité de la convenance sur la fidélité.
- **Résultat (test)** : les contextes explicites aboutissent désormais (image décente, tout public).
  Seuls les contextes très « hard » sont encore bloqués **côté Cloudflare** (assumé).

## 2 — Bump de version 1.4.7 🟢 ✅

- `VersionHandlerService.appVersionDisplay` → « **1.4.7** » ; `appVersion` **inchangé** (4).
- `android/app/build.gradle` : `versionName` « **1.4.7** », `versionCode` 17 → **18**.
- Entrée **en tête** de `RELEASE_NOTES` : 1.4.7.
- Commit final nommé **`1.4.7`**.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Neutraliser le vocabulaire de l'instruction image (B) | 🟢 | ✅ Fait |
| 2 | Bump 1.4.7 | 🟢 | ✅ Fait |
