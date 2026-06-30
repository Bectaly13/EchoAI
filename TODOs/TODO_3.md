# TODO_3 — Correctifs (2ᵉ passe de recette)

Ajustements issus de la 2ᵉ vague de tests fonctionnels (après `TODO_2.md`). Même modèle : reformulés, **ordonnés par priorité** (valeur/effort + dépendances), avec méthode et limites. La référence entre parenthèses renvoie au point d'origine (`TODO.md` / `TODO_2.md`).

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

> Périmètre : correctifs fonctionnels uniquement. L'UI/UX fera l'objet d'un `TODO_UI.md` séparé.

---

## 1 — Mémoire : rafraîchir la liste après ajout *(corrige TODO_2 #6)* 🟢 ✅ Fait
Après l'ajout d'un souvenir, la liste ne se met pas à jour (le changement n'apparaît qu'en rouvrant l'écran). La donnée est bien enregistrée — c'est l'affichage qui ne se rafraîchit pas.

- **Cause probable** : le flux d'ajout enchaîne **deux `AlertController`** (catégorie puis valeur), le 2ᵉ étant présenté depuis le *handler* du 1ᵉ. Cette présentation imbriquée fait que la mise à jour de `this.groups` n'est pas reflétée (hors cycle de détection). La suppression (un seul `AlertController`) fonctionne, ce qui confirme la piste.
- **Méthode** : remplacer l'enchaînement par-handler par `await alert.onDidDismiss()` : présenter l'alerte de catégorie, attendre sa fermeture, puis présenter l'alerte de valeur depuis la méthode de page (plus de présentation imbriquée). La mise à jour de `this.groups` se fait alors dans le bon contexte.

## 2 — Suppression : protéger la salutation + bouton « Réinitialiser » *(corrige TODO_2 #3)* 🟡 ✅ Fait
On ne doit pas pouvoir supprimer le **premier message** (la salutation). Pour recommencer, un bouton dédié réinitialise la conversation.

- **Garde-fou** : le bouton 🗑 est masqué sur le **premier message** de la conversation ; par sécurité, `ChatService.deleteFrom` refuse aussi de supprimer à partir de l'index 0.
- **Réinitialiser** : `ChatService.resetConversation(characterId)` — **réinitialisation complète** : efface tous les messages **et la mémoire permanente** (y compris les souvenirs manuels), puis remet la salutation. Conserve le persona actif. Bouton dédié (↺) dans l'en-tête du chat, avec confirmation.

## 3 — Narration à la 3ᵉ personne (voix de narrateur) *(corrige TODO_2 #5 / point 2)* 🟢 ✅ Fait
La narration (entre astérisques) ne doit **pas** être à la 1ʳᵉ personne. Elle doit être une voix de narrateur (3ᵉ personne) décrivant actions, lieux et événements — ce qui permet à l'histoire de **continuer** même quand le personnage sort de la scène (ex. l'utilisateur se retrouve seul).

- **Méthode** : préciser dans `buildFormatBlock` (`buildSystemPrompt`) que la narration est à la 3ᵉ personne, comme un narrateur omniscient, et peut décrire la scène indépendamment du personnage. Aligner l'instruction du champ `greeting` de `buildDraftPrompt` (retirer le « à la 1ʳᵉ personne »). Les **répliques** restent au format `Nom : "…"` (le personnage parle naturellement à la 1ʳᵉ personne dans les guillemets) — seule la narration change.

## 4 — Persona : suffixe « (défaut) » dans la sélection *(corrige TODO_2 #4)* 🟢 ✅ Fait
Dans la modale de choix du persona, indiquer lequel est le persona par défaut.

- **Méthode** : ajouter « (défaut) » au libellé du persona `isDefault` dans `personaOptionLabel` (chat).

## 5 — Suivi : fenêtre du jour alignée sur l'heure du Pacifique *(corrige TODO_2 #7)* 🟢 ✅ Fait
Le compteur « du jour » bascule à minuit **local**, alors que le quota gratuit Gemini se réinitialise à minuit **Pacifique**. Aligner la fenêtre sur le fuseau de Google pour coller au vrai reset.

- **Méthode** : dans `UsageService`, calculer la date du jour via `Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", … })` (gère automatiquement l'heure d'été). L'avertissement de la page reste (estimation, pas de lecture officielle du quota).

---

## Récapitulatif de l'ordre

| Ordre | Correctif | Corrige | Effort | État |
| ----- | --------- | ------- | ------ | ---- |
| 1 | Mémoire : rafraîchir la liste après ajout | TODO_2 #6 | 🟢 | ✅ Fait |
| 2 | Suppression : protéger la salutation + bouton Réinitialiser | TODO_2 #3 | 🟡 | ✅ Fait |
| 3 | Narration à la 3ᵉ personne (voix de narrateur) | TODO_2 #5 | 🟢 | ✅ Fait |
| 4 | Persona : suffixe « (défaut) » dans la sélection | TODO_2 #4 | 🟢 | ✅ Fait |
| 5 | Suivi : fenêtre du jour alignée sur le Pacifique | TODO_2 #7 | 🟢 | ✅ Fait |
