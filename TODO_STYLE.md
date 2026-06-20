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

## 5 — /chat/{id} 🟡 ✅ Fait
- ✅ **Passer mon tour** + **Illustrer la scène** : sortis du footer, placés dans `.chat-quick` ancré en **position absolue** juste au-dessus de la zone de saisie (`bottom: calc(100% + 8px)`), **en bas à droite** — position fixe quel que soit le défilement.
- 🟡 **Footer & zone sûre** : `padding-bottom: calc(10px + var(--safe-bottom))` ajouté sur `.chat-footer`. *(À confirmer sur le build mobile.)*
- ✅ **Régénérer / Supprimer** (`message-bubble`) : contour (cf. point 2) avec couleurs **adaptées à l'émetteur** (`--icon-btn-border` + `--app-text` sur bulle IA, `--app-on-accent` sur bulle utilisateur).
- ✅ **Bulles utilisateur** : alignées à droite (correctif : `align-self` porté sur `:host`, qui est le vrai élément flex) + **largeur constante** (`width: 78%`).
- ✅ **Débordement** : footer réduit à input + Envoyer ; `min-width: 0` sur `.chat-input` → plus de débordement.
- ✅ **Bonus** : bug de régénération (bouton parfois masqué sur la dernière réponse IA) corrigé (`message !== this.messages[0]` au lieu du test `some(role === "user")`) ; icône `↺` (réinitialiser) qui restait blanche en thème clair → `color: var(--app-text)`.

> **À tester sur mobile** : safe-area du footer (#5) **et** safe-area des flash d'erreur (toasts Ionic en bas) — Ionic dérive `--ion-safe-area-bottom` de `env()`, donc *a priori* géré, à confirmer.

## 6 — /memory/{id} 🟢 ✅ Fait
- Contour des boutons éditer/supprimer par entrée (cf. point 2).

## 7 — /conversations 🟢 ✅ Fait
- Contour du bouton supprimer (cf. point 2).

## 8 — /personas 🟢 ✅ Fait
- ✅ Contour des boutons éditer/supprimer (cf. point 2).
- ✅ **Toujours afficher le persona par défaut en haut** de la liste (tri dans `loadPersonas`, robuste au `isDefault` `undefined`).
- ✅ Renommer l'étiquette « par défaut » en « **Par défaut** » (P majuscule).

## 9 — /persona-form 🟢 ✅ Fait
- ✅ Corriger le placeholder « Qui es-tu… » → « **Qui tu es**… ».

## 10 — /tokens 🟢 ✅ Fait
- ✅ Renommer l'étiquette « préféré » en « **Préféré** » (P majuscule).

## 11 — /settings 🟢 ✅ Fait
- ✅ Les **boutons de thème** occupent **toute la largeur** disponible (`flex: 1 1 0`), **sur une seule ligne** (suppression de `flex-wrap`), tous de **largeur égale**, texte centré.

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
| 5 | /chat : passer/illustrer fixes, safe-area footer, contour boutons, bulles user à droite + largeur fixe, débordement input | 🟡 | ✅ Fait (safe-area à tester mobile) |
| 6 | /memory : contour boutons éditer/supprimer | 🟢 | ✅ Fait |
| 7 | /conversations : contour bouton supprimer | 🟢 | ✅ Fait |
| 8 | /personas : contour boutons + défaut en haut + « Par défaut » | 🟢 | ✅ Fait |
| 9 | /persona-form : placeholder « Qui tu es » | 🟢 | ✅ Fait |
| 10 | /tokens : étiquette « Préféré » | 🟢 | ✅ Fait |
| 11 | /settings : boutons de thème pleine largeur, égaux, une ligne | 🟢 | ✅ Fait |
| 12 | Sous-pages (form, mémoire) : marge basse pour la safe-area | 🟢 | À faire |
