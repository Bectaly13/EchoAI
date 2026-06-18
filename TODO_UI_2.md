# TODO_UI_2 — Ajustements après recette UI

Retours de la recette de la restructuration UI (`TODO_UI.md`). Correctifs et ajustements (pas encore le style fin). Même modèle : reformulés, **ordonnés par priorité**, avec méthode et limites.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

---

## 1 — Version affichée décorrélée de la version de stockage *(retour 10)* 🟢 ✅ Fait
`appVersionDisplay` n'est pas `appVersion + ".0"` : ce sont deux notions distinctes.

- `appVersion` (entier) : version du **format de stockage**, incrémentée à chaque migration de données au démarrage. **Reste à 3.**
- `appVersionDisplay` (chaîne) : version **commerciale**, pertinente pour l'utilisateur. **Passe à « 1.0 »** et y reste jusqu'à la finalisation de l'app / les premiers tests utilisateur.
- **Méthode** : dans `VersionHandlerService`, fixer `appVersionDisplay = "1.0"` (laisser `appVersion = 3`), et clarifier les commentaires sur la distinction.

## 2 — Formulaire de personnage : section IA et génération d'image *(retour 6)* 🟢 ✅ Fait
- **Renommer** la section « Brouillon (assistance IA) » en « **Création par IA** ».
- **Masquer** cette section en **mode édition** (la création assistée n'a de sens qu'à la création) : `@if (!isEditing())`.
- **Masquer complètement** la section de génération d'image de profil (la fonctionnalité est désactivée) : **commenter** le code correspondant (HTML), **ne pas le supprimer**, pour réactivation future.

## 3 — Page Tokens : pas de mention de la génération d'image *(retour 9)* 🟢 ✅ Fait
La génération d'image étant désactivée, ne pas afficher la section « Image ».

- **Méthode** : **commenter** (ne pas supprimer) la section image du `tokens.page.html` (et laisser le calcul `imageModels` en place côté `.ts`, inutilisé, pour réactivation).

## 4 — Page Conversations : avatars sur les lignes *(retour 7)* 🟢 ✅ Fait
Afficher la photo de profil (ou la pastille de couleur + initiale) de chaque personnage sur les lignes de conversation, **même style** que les cartes de la page Personnages.

- **Méthode** : enrichir `ConversationSummary` (`avatarColor`, `avatarImage`) ; afficher dans `conversations.page.html` un avatar (image si présente, sinon pastille de couleur avec l'initiale), styles repris de `character-card`.

## 5 — Narration : adresse à l'utilisateur et retours à la ligne *(retour 7)* 🟢 ✅ Fait
Améliorer les consignes de format envoyées à l'IA (`buildFormatBlock`).

- **« tu »** : dans la narration, l'IA doit désigner l'utilisateur par « **tu** » (jamais « l'utilisateur » ni une 3ᵉ personne pour lui).
- **Retours à la ligne** : passer à la ligne quand on passe de la narration à une réplique (ou inversement), pour aérer la lecture.

## 6 — Mémoire permanente : éviter les doublons *(retour 7)* 🟡 ✅ Fait
Des éléments déjà mémorisés sont ré-enregistrés → doublons qui alourdissent les requêtes suivantes. Approche retenue : **anti-doublons** (prompt + dédoublonnage côté client), qui **conserve** le rollback et les souvenirs manuels.

- **Prompt** (`buildMemoryInstructionBlock`) : rappeler que la mémoire actuelle est fournie ; ne jamais réinscrire un élément déjà présent à l'identique ; pour lieu/relation, ne ré-écrire que si la valeur change (remplacement) ; pour jalons/consignes, n'ajouter que du réellement nouveau.
- **Client** (`applyMemoryUpdates`) : pour les catégories à valeurs multiples, ignorer une valeur déjà présente dans la catégorie (comparaison normalisée : trim + minuscules).
- **Limite (assumée)** : l'IA ne supprime pas elle-même un jalon/consigne existant ; l'utilisateur peut le faire via l'écran mémoire. Le rollback (régénération/suppression) et les souvenirs manuels sont préservés.

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Retour | Effort | État |
| ----- | ----- | ------ | ------ | ---- |
| 1 | Version affichée décorrélée (appVersionDisplay « 1.0 ») | 10 | 🟢 | ✅ Fait |
| 2 | Formulaire perso : section IA (renommage, masquée en édition) + image masquée | 6 | 🟢 | ✅ Fait |
| 3 | Tokens : section image masquée (commentée) | 9 | 🟢 | ✅ Fait |
| 4 | Conversations : avatars sur les lignes | 7 | 🟢 | ✅ Fait |
| 5 | Narration : « tu » + retours à la ligne | 7 | 🟢 | ✅ Fait |
| 6 | Mémoire : anti-doublons (prompt + dédoublonnage) | 7 | 🟡 | ✅ Fait |
