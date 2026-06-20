# TODO_STYLE — Style & rendu visuel

Première passe de **style** (marges, palettes, dispositions, rendu). Même modèle que les autres TODO : reformulé, **ordonné par priorité**, avec la méthode ou les limites par point.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

Conventions de cette volée :
- Jamais de couleur en dur → **variables CSS** (`--app-*`, etc.), définies par thème dans `theme/variables.scss`. Les nouvelles couleurs thème-dépendantes deviennent des variables.
- SCSS ordonné selon l'apparition dans le HTML.
- Cible **mobile** (tenir compte des zones sûres : `--safe-top` / `--safe-bottom`).

---

## 1 — Remplacer les pop-ups natifs (AlertController) par des modales custom 🔴 ✅ Fait
> **Fait** : composants réutilisables `app-modal` (coquille : backdrop + carte + titre + contenu projeté) et `app-confirm-modal` (confirmation), styles de boutons partagés (`.modal-btn*` dans `global.scss`), variable `--app-backdrop`. **12 alertes migrées** (les 9 listées **+ 3 non listées** trouvées au recensement : suppression d'un **message** dans le chat, **« Tout oublier »** de la mémoire, suppression de **persona**) → plus aucun `AlertController` dans l'app. Le **style fin** des modales reste un TODO ultérieur.

Remplacer tous les `AlertController` par des **modales applicatives** : une fenêtre **par-dessus le contenu** (ne couvre pas tout l'écran), **fond assombri** (backdrop) cliquable pour fermer. Objectif : liberté de style (le **style fin des modales** sera un TODO séparé — ici on met juste l'infra + la migration).

- **Méthode proposée** : un composant réutilisable **`app-modal`** (backdrop + carte centrée + titre optionnel + contenu projeté + zone de boutons), réutilisé pour les **trois types** d'interaction :
  - **confirmation** (Annuler / Confirmer) ;
  - **saisie texte** (un champ) ;
  - **sélection** (liste d'options / radios).
  Chaque page pilote sa modale via un état local (`@if (showXxx)`) — pas de service impératif, pour garder la main sur le style.
- **À confirmer avant implémentation** : composant + état local par page (proposé) **vs** un `ModalService` impératif façon AlertController. *(Je partirai sur le composant sauf avis contraire.)*
- **Alertes à migrer** (9) :
  - demande du nom de l'utilisateur au 1er démarrage (page Personnages) ;
  - confirmation de suppression de **personnage** (Personnages) ;
  - confirmation de suppression de **conversation** (Conversations) ;
  - **sélection de persona** dans une conversation (Chat) — type *sélection* ;
  - confirmation de **réinitialisation** de conversation (Chat) ;
  - **création** de souvenir — 2 étapes : choix de catégorie (*sélection*) puis saisie (*texte*) (Mémoire) ;
  - **modification** de souvenir — *texte* (Mémoire) ;
  - confirmation de **suppression** de souvenir (Mémoire).
- **Limite** : gros morceau (≈ toutes les pages touchées). Le style définitif des modales viendra ensuite.

## 2 — Boutons icônes (éditer / supprimer) : contour pour le contraste 🟢 ✅ Fait
> **Fait** : variable `--icon-btn-border` par thème (gris foncé en Défaut/Sombre, gris clair en Clair) + classe globale **`.icon-btn`** (contour, **taille carrée fixe 34×34**, glyphe centré, `color: var(--app-text)` pour que ✎ reste visible en thème clair). Appliquée à `character-card`, **Mémoire**, **Conversations**, **Personas**. Le `message-bubble` (régénérer/supprimer) est traité au **#5** (couleur selon l'émetteur).

Cross-cutting — les boutons icônes manquent de contraste. Leur ajouter un **contour carré aux coins arrondis**, avec une couleur **thème-dépendante** : **gris foncé** en thèmes **Défaut** et **Sombre**, **gris clair** en thème **Clair**. Ajouter de petites **marges** entre les boutons si besoin.

- **Méthode** : introduire une variable CSS dédiée (ex. `--icon-btn-border`) définie par thème dans `variables.scss`, puis appliquer un style commun (contour + rayon + padding) aux boutons concernés.
- **Pages/composants concernés** : `character-card` (éditer/supprimer), page **Mémoire** (éditer/supprimer par entrée), page **Conversations** (supprimer), page **Personas** (éditer/supprimer), et `message-bubble` (régénérer/supprimer — cf. point 5, couleur selon l'émetteur du message).

## 3 — /characters 🟢 ✅ Fait
- Appliquer le contour des boutons éditer/supprimer (cf. point 2) sur les cartes de personnage + marges pour les espacer.

## 4 — /character-form 🟢 ✅ Fait
- ✅ Retirer le **`margin-top` inutile** sur `.character-form-avatar` (le label interne porte déjà sa marge haute).
- ✅ Mettre le bouton **« Retirer »** (avatar) **sur la même ligne** que « Générer une image » (`.character-form-avatar-actions` en `row`), dans un **style similaire** mais **contour arrondi rouge** (`var(--app-danger)`).
- ✅ **Largeur fixe** du bouton de génération d'image (170 px, texte centré) pour qu'il ne saute plus selon son libellé (« Générer une image » / « Régénérer l'image » / « Génération… »).

## 5 — /chat/{id} 🟡
- **Passer mon tour** + **Illustrer la scène** : les sortir du footer et les placer **au-dessus** du footer de saisie, en **sticky**, **en bas à droite** de la zone de conversation (ils restent visibles au scroll).
- **Footer & zone sûre** : aujourd'hui `.chat-footer` ne tient **pas** compte des boutons de navigation du téléphone → ajouter un `padding-bottom: calc(... + var(--safe-bottom))` (comme la navbar) pour éviter le chevauchement.
- **Régénérer / Supprimer** (`message-bubble`) : ajouter un **contour** pour le contraste (cf. point 2), avec des couleurs **adaptées à l'émetteur** du message (bulle utilisateur sur fond accent vs bulle IA sur fond surface).
- **Bulles utilisateur** : les **coller à droite** de l'écran.
- **Débordement** : s'assurer que l'**input texte + bouton Envoyer** ne **débordent plus** de `.chat-footer` (régression depuis le retour du bouton « Illustrer la scène » — résolue en partie en sortant les boutons du footer, point ci-dessus).

## 6 — /memory/{id} 🟢 ✅ Fait
- Contour des boutons éditer/supprimer par entrée (cf. point 2).

## 7 — /conversations 🟢 ✅ Fait
- Contour du bouton supprimer (cf. point 2).

## 8 — /personas 🟢
- ✅ Contour des boutons éditer/supprimer (cf. point 2).
- ⬜ **Toujours afficher le persona par défaut en haut** de la liste (tri : défaut d'abord, puis le reste).
- ⬜ Renommer l'étiquette « par défaut » en « **Par défaut** » (P majuscule).

## 9 — /persona-form 🟢
- Corriger le placeholder « Qui es-tu… » → « **Qui tu es**… ».

## 10 — /tokens 🟢
- Renommer l'étiquette « préféré » en « **Préféré** » (P majuscule).

## 11 — /settings 🟢
- Les **boutons de thème** s'élargissent pour occuper **toute la largeur** disponible (en tenant compte des marges), **sur une seule ligne**, tous de **largeur égale**.

## 12 — Sous-pages : marge basse pour la zone sûre 🟢
Les sous-pages **sans navbar** (`character-form`, `persona-form`, `memory`) n'ont **pas** de marge basse pour la safe-area → le dernier élément (Enregistrer, Tout oublier…) peut passer **sous la barre de navigation** du téléphone.

- **Méthode** : ajouter un `--padding-bottom` (≈ `calc(16px + var(--safe-bottom))`) à l'`ion-content` de ces sous-pages. *(Le chat est traité au #5 via son footer.)*

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Modales custom en remplacement des AlertController | 🔴 | ✅ Fait |
| 2 | Boutons icônes : contour pour le contraste (variable + transverse) | 🟢 | ✅ Fait |
| 3 | /characters : contour boutons éditer/supprimer | 🟢 | ✅ Fait |
| 4 | /character-form : margin avatar + bouton « Retirer » inline rouge + largeur fixe bouton image | 🟢 | ✅ Fait |
| 5 | /chat : sticky passer/illustrer, safe-area footer, contour boutons, bulles user à droite, débordement input | 🟡 | À faire |
| 6 | /memory : contour boutons éditer/supprimer | 🟢 | ✅ Fait |
| 7 | /conversations : contour bouton supprimer | 🟢 | ✅ Fait |
| 8 | /personas : contour boutons (✅) + défaut en haut + « Par défaut » | 🟢 | 🟡 Partiel |
| 9 | /persona-form : placeholder « Qui tu es » | 🟢 | À faire |
| 10 | /tokens : étiquette « Préféré » | 🟢 | À faire |
| 11 | /settings : boutons de thème pleine largeur, égaux, une ligne | 🟢 | À faire |
| 12 | Sous-pages (form, mémoire) : marge basse pour la safe-area | 🟢 | À faire |
