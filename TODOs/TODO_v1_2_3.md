# TODO_v1_2_3 — Version 1.2.3 (UI/UX)

Mise à jour **mineure** UI/UX : modales à titre/boutons figés (hors scroll), genre des personas (transmis à l'IA), et heures de réinitialisation des quotas dans `/tokens`.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

> **✅ Statut : tous les points (1 à 5) sont implémentés, version passée en 1.2.3.** À valider en recette : modales (titre/boutons fixes), genre transmis à l'IA, heures de reset (vérifiées : Paris été = 02:00 image / 09:00 texte).

---

## 1 — Modales : titre + boutons toujours visibles (hors du scroll) 🟡

**Constat** : `app-modal` fait défiler **toute** la carte (`.modal-card` en `overflow-y: auto`) → quand le contenu est long (longues listes), le **titre** et les **boutons** disparaissent au scroll. Concerné surtout par :
- la modale **« Nouvelle conversation »** (`/conversations`) — liste de tous les personnages ;
- la modale de **sélection de persona** (`/chat`) — liste des personas.

**Audit des autres modales** : les autres contenus sont bornés (catégorie de souvenir = 4 items, saisie = textarea, nom au 1er lancement, confirmation). Elles n'« explosent » pas, mais on applique le **même système** partout pour garder titre + boutons visibles (uniforme et sans risque).

- **Méthode — `app-modal`** (`components/modal/`) : restructurer la carte en **3 zones** : titre (fixe) + **corps défilant** (`<ng-content>` par défaut) + **footer fixe** (`<ng-content select="[modalFooter]">`). Le scroll passe sur le **corps** uniquement.
  - `.modal-card` : `display:flex; flex-direction:column; max-height:80vh;` (plus d'`overflow` sur la carte).
  - `.modal-body` : `flex:1 1 auto; min-height:0; overflow-y:auto;`.
  - `.modal-footer` : `flex:0 0 auto;`.
- **Méthode — migration** : sur chaque usage d'`app-modal`, ajouter l'attribut **`modalFooter`** au `div` d'actions (il est alors projeté dans le footer fixe, quel que soit son ordre dans le contenu) :
  - `confirm-modal` (`.confirm-actions`), `/characters` (`.characters-modal-actions`), `/chat` (`.chat-modal-actions`), `/conversations` (`.conversations-modal-actions`), `/memory` (`.memory-modal-actions` ×2).
- **Limite** : toutes les modales actuelles ont un footer (boutons) ; le slot footer est donc toujours alimenté.

## 2 — Genre des personas 🟡

Genrer les personas (homme / femme / autre) et **transmettre le genre à l'IA** dans la conversation (réponses plus fidèles à l'utilisateur).

- **Modèle** (`persona-service.ts`) : ajouter `gender` à `Persona` (type `PersonaGender = "male" | "female" | "other"`). Additif → **pas de migration** ; à l'affichage/au prompt, un persona sans genre est traité comme non précisé.
- **Création / édition** (`persona-form`) : sélecteur de genre (3 options), **« Homme » par défaut** en création. `create(...)`/`update(...)` transmettent le genre.
- **Premier démarrage** (`/characters`, modale de nom du persona par défaut) : demander **aussi le genre** (par défaut « Homme »), enregistré sur le persona par défaut.
- **Transmission à l'IA** (`build-system-prompt.ts`, `buildPersonaBlock`) : ajouter le genre au bloc UTILISATEUR (PERSONA), ex. « L'utilisateur incarne « X » (un homme / une femme / une personne non binaire). » — ligne omise si genre non précisé.
- **Décision — libellés** : « **Homme / Femme / Autre** ».

## 3 — Cadrage de la description du persona dans le prompt 🟢

**Constat** : la description est injectée **brute** dans le bloc UTILISATEUR (PERSONA) (cadré en 3ᵉ personne), alors que l'utilisateur l'écrit souvent en « je »/« tu » → ambiguïté (le « je » peut être lu comme le personnage IA).

- **Méthode** (`build-system-prompt.ts`, `buildPersonaBlock`) : **cadrer** la description — « L'utilisateur se décrit ainsi : « … » » — pour que toute personne grammaticale (je / tu / descriptif) soit correctement attribuée à l'utilisateur. Placeholder du formulaire inchangé (2ᵉ personne, naturel).

## 4 — /tokens : heures de réinitialisation par modèle 🟢

Afficher, pour chaque modèle, l'heure de **reset** du quota (déjà identifiées) :
- **Texte (Gemini)** : minuit **heure du Pacifique** (déjà le fuseau de `UsageService.todayFor("text")`).
- **Image (Cloudflare)** : **00:00 UTC** (déjà le fuseau de `todayFor("image")`).

- **Méthode** (`tokens.page`) : afficher une ligne discrète par card, ex. « Réinit. à minuit (Pacifique) » / « Réinit. à 00:00 UTC ». Helper `resetLabel(kind)`. Restructurer légèrement `.tokens-row` (nom + sous-ligne reset à gauche, stats à droite).
- **Décision — affichage** : **heure convertie dans le fuseau local** de l'appareil (ex. « Réinit. à 09:00 »). Calcul de l'heure locale correspondant à 00:00 dans le fuseau source (Pacifique / UTC), via `Intl.DateTimeFormat` (gère le décalage DST courant).

## 5 — Bump de version 1.2.3 🟢 ✅ Fait

- ✅ `VersionHandlerService.appVersionDisplay` → « **1.2.3** ».
- ✅ `android/app/build.gradle` : `versionName` « **1.2.3** », `versionCode` → **7**.
- ✅ `appVersion` (format bdd) **inchangé**.
- ✅ Entrée **en tête** de `RELEASE_NOTES` : 1.2.3.
- Commit final nommé **`1.2.3`**.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Modales : titre + boutons hors du scroll (footer fixe) | 🟡 | ✅ Fait |
| 2 | Genre des personas (création/édition + 1er démarrage + prompt) | 🟡 | ✅ Fait |
| 3 | Cadrage de la description du persona dans le prompt | 🟢 | ✅ Fait |
| 4 | /tokens : heures de réinitialisation par modèle | 🟢 | ✅ Fait |
| 5 | Bump 1.2.3 | 🟢 | ✅ Fait |

---

## Décisions tranchées
1. **#2** : libellés « **Homme / Femme / Autre** ».
2. **#4** : reset affiché en **heure locale** de l'appareil.

## À valider après implémentation (recette)
- Modales à longue liste : titre + boutons restent visibles, seule la liste défile.
- Genre choisi à la création/édition d'un persona et au 1er démarrage ; pris en compte dans les réponses de l'IA.
- /tokens affiche l'heure de reset de chaque modèle.
