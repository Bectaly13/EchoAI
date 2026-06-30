# TODO_v1_1 — Version 1.1

Retours de la première recette **sur mobile** (après le build 1.0). Correctifs fonctionnels, qualité des réponses IA, ajustements d'UI, et mise en place du versionnage commercial (notes de version + passage en 1.1). Même modèle que les autres TODO : points **ordonnés par priorité**, avec méthode, limites, et **questions à trancher** avant implémentation.

Légende effort : 🟢 faible · 🟡 moyen · 🔴 élevé.

> **✅ Statut : tous les points (1 à 10, dont 3b) sont implémentés.** Restent à valider sur le build mobile : la StatusBar (#8) et les comportements de prompt (longueur des réponses, mémoire, personnages secondaires).

> **À noter** : les safe-area (haut et bas, y compris sous-pages) sont **validées sur mobile** — les points #5 et #12 du `TODO_STYLE` sont confirmés OK.

---

## Réponses aux questions techniques (état actuel du code)

Avant les correctifs, voici **exactement** comment fonctionne le prompt aujourd'hui (sources : `utils/build-gemini-contents.ts`, `services/gemini-service.ts`, `utils/build-system-prompt.ts`, `services/chat-service.ts`).

**Ce qui est envoyé à Gemini à chaque tour, en deux parties distinctes :**
1. **`systemInstruction`** (jamais tronqué) = le **prompt système** assemblé par `buildSystemPrompt` : bloc PERSONNAGE (nom + personnalité + apparence + relation + goûts + connus), bloc UTILISATEUR (PERSONA), bloc **MÉMOIRE PERMANENTE**, consignes de format, consignes de mémoire.
2. **`contents`** = l'**historique** des messages, construit par `buildGeminiContents` qui **ne garde que les 20 derniers messages** (`MAX_MESSAGES = 20`, illustrations exclues).

**Donc, quand l'historique devient trop grand, ce qui « saute » = uniquement les messages de conversation les plus anciens (au-delà des 20 derniers).** La **mémoire permanente**, le **persona** et la **fiche du personnage** ne sont **jamais** tronqués : ils sont dans `systemInstruction`. C'est exactement le comportement voulu (« c'est l'historique qui doit en pâtir »).

**Conséquences pour tes observations :**
- **Mémoire (lecture)** : ✅ déjà transmise et prise en compte — `buildMemoryBlock` l'injecte dans le prompt système dès qu'il y a au moins une entrée. Rien à corriger côté lecture (à re-vérifier après #3 ci-dessous).
- **Mémoire (écriture)** : ⚠️ le problème **n'est pas** une troncature. L'écriture dépend du modèle qui doit ajouter un bloc `[[MEMORY]]` en fin de réponse, **et seulement « si un élément durable change »**. C'est volontairement conservateur → en pratique le modèle l'oublie souvent. Voir #3.
- **Personas** : ✅ transmis en entier à chaque tour (jamais tronqués).
- **Limite = nombre de messages, pas de tokens.** 20 messages fixes, pas de calcul de budget de tokens. Une question ouverte est de savoir si 20 suffit (voir #3, question).

---

## 1 — Tronquer le prompt image (avatar + scène) à ≤ 2048 caractères 🟢 🐞 bug

**Symptôme** : `length of /prompt must be <= 2048` à la génération d'image (photo de profil **et** illustration de scène). Cloudflare FLUX refuse tout prompt de plus de 2048 caractères. `buildSceneImagePrompt` concatène le texte des 4 derniers messages (souvent long), et `buildImagePrompt` peut dépasser si l'apparence/personnalité est verbeuse.

- **Méthode** : tronquer **au point de passage unique** `ImageService.generate(prompt)` (`services/image-service.ts`) — couvre les deux cas (avatar via `character-service.ts:130`, scène via `chat-service.ts:266`). Couper proprement à une marge de sécurité (ex. **2000** caractères) avant l'envoi.
- **Limite** : une coupe brutale peut tronquer en milieu de phrase ; acceptable pour un prompt image. Optionnellement, couper sur le dernier séparateur (`. `/espace) avant la limite.

## 2 — Réponses du chat trop longues 🟡

**Symptôme** : réponses fleuves (plusieurs sections de ~15 lignes de narration). On passe plus de temps à lire qu'à écrire.

- **Méthode** : ajouter une **consigne de concision** dans `buildFormatBlock` (`utils/build-system-prompt.ts`) :
  - chaque **paragraphe de narration fait ~30 mots AU MAXIMUM** ;
  - **au plus 3 paragraphes de narration** par réponse ;
  - ce sont des **maximums**, pas des objectifs : rien n'oblige à les atteindre — privilégier les échanges courts qui laissent la main à l'utilisateur.
- **Décision** : pas de `maxOutputTokens` dur ; on cadre uniquement par le prompt et on ajuste au besoin.

## 3 — Mémoire permanente : écriture peu fiable au fil de la conversation 🟡

**Constat** : ce n'est **pas** la taille de l'historique qui bloque l'écriture. Le problème : l'IA n'arrive pas à juger ce qui constitue un changement « durable » et reste trop **timide** → elle ajoute rarement le bloc `[[MEMORY]]`.

- **Méthode** : **alléger les conditions** dans `buildMemoryInstructionBlock` (`utils/build-system-prompt.ts`). Remplacer la formulation « si et seulement si un élément durable change » par une consigne plus simple et plus engageante : la mémoire permanente doit **conserver les points importants de la conversation** (lieu courant, relation avec l'utilisateur, jalons, consignes) dès qu'ils apparaissent — sans exiger qu'ils « changent ». Conserver l'anti-doublon existant (ne pas réinscrire un élément déjà présent à l'identique).
- **Décision** : ne pas toucher à `MAX_MESSAGES` (la taille de l'historique fourni n'est pas en cause).

### 3b — Le bloc mémoire fuit parfois dans la conversation 🟢 🐞 bug

**Symptôme** : à la fin de certaines réponses, des lignes brutes (`location: …`, `relationship: …`) s'affichent **directement dans la bulle** au lieu d'être retirées et rangées en mémoire permanente.

**Cause** : `parseMemory` (`utils/parse-memory.ts`) ne retire et n'interprète les lignes **que** lorsqu'elles sont encadrées par `[[MEMORY]]…[[/MEMORY]]`. Quand le modèle émet les lignes **sans les balises** (ou avec des balises mal formées), rien n'est retiré (→ fuite à l'écran) **ni** enregistré.

- **Méthode** : rendre `parseMemory` tolérant. À défaut de bloc balisé, détecter en **fin de message** les lignes isolées de forme `categorie: valeur` dont la catégorie est connue (`location` / `relationship` / `milestone` / `instruction`), les **retirer du texte affiché** et les traiter comme mises à jour. Risque de faux positif faible (catégories en anglais minuscules, absentes de la narration FR ; les répliques suivent le format `Nom : "…"` avec espace + guillemets).
- **Lien avec #3** : à traiter ensemble (alléger la consigne d'écriture **et** fiabiliser/assainir le parsing).

## 4 — Faire parler les personnages secondaires 🟡

**Constat** : le prompt ancre fortement sur un seul personnage (« Tu incarnes X. Reste fidèle à ce personnage en toutes circonstances », exemple à un seul locuteur). Rien n'**interdit** explicitement les autres, mais rien ne les **autorise** non plus → le modèle ne fait parler que le personnage principal.

- **Méthode** : ajouter dans `buildSystemPrompt` (bloc format ou bloc personnage) une consigne explicite : **tu peux faire parler et agir tous les personnages présents dans la scène** (secondaires, figurants, PNJ), chacun préfixé par son nom selon le format, tout en restant le narrateur. Le personnage principal reste le « point de vue », mais la scène est vivante.
- **Cohérence avec le draft (salutation)** : la consigne `greeting` de `buildDraftPrompt` (`utils/build-draft-prompt.ts`) génère le message d'ouverture **indépendamment** du prompt système. Elle doit donc **aussi autoriser explicitement** les personnages secondaires à parler dans la salutation (même convention), pour que les fiches créées par IA plantent un décor vivant dès l'ouverture — et non un monologue du seul personnage principal.
- **Limite** : à équilibrer avec #2 (concision) pour ne pas générer des dialogues à rallonge entre PNJ, salutation comprise.

## 5 — Création de personnage : ne pas brider les personnages secondaires 🟢

**Constat** : `build-draft-prompt.ts` contient « **N'invente pas de personnages connus si le brouillon n'en mentionne pas.** » → bride l'invention de personnages secondaires, qui pourtant enrichissent le contexte (et restent éditables/supprimables par l'utilisateur).

- **Méthode** : **retirer cette ligne** de `buildDraftPrompt`. **Ne rien spécifier** d'autre au sujet des personnages secondaires ou connus : l'IA décidera d'elle-même ce qui est pertinent.

## 6 — /character-form : padding du corps 🟢

- **Méthode** : `.character-form-body` → `padding: 16px 16px 0px` (plus de padding bas ; l'espace bas vient déjà du `--padding-bottom` safe-area de l'`ion-content`, point #12 du TODO_STYLE).

## 7 — Bulles de chat : icônes régénérer/supprimer à gauche 🟢

- **Méthode** : `.message-bubble-actions` → `justify-content: flex-start` (au lieu de `flex-end`), dans `components/message-bubble/message-bubble.component.scss`.

## 8 — StatusBar Android adaptée au thème 🟢

Le plugin `@capacitor/status-bar` est installé mais inutilisé → barre d'état non accordée au thème (icônes parfois illisibles, fond non assorti).

- **Méthode** (plan déjà rédigé) : centraliser dans `ThemeService.applyTheme()` (appelé au démarrage et à chaque changement de thème). Par thème : `StatusBar.setStyle` (Défaut/Sombre → icônes claires = `Style.Dark` ; Clair → icônes sombres = `Style.Light`) + `setBackgroundColor` (Android) avec la couleur lue dans `--header-background`. Garde `Capacitor.isNativePlatform()` + `try/catch`.
- **Limite** : sur Android 15 edge-to-edge, `setBackgroundColor` peut être sans effet (barre transparente) ; `setStyle` garde les icônes lisibles et le header fournit la couleur derrière. Sans impact sur le web/tests.

## 9 — Notes de version : sous-page /versions 🟡

Nouvelle sous-page de `/settings` listant les mises à jour par version. **La plus récente en haut**, avec la mention « **Actuelle** ».

- **Méthode** :
  - Nouvelle route `versions` dans `app.routes.ts` (sous-page sans navbar, header avec retour comme les autres sous-pages).
  - Nouvelle page `pages/versions/` (`.page.ts/.html/.scss/.spec.ts`).
  - Bouton « Notes de version » dans `settings.page.html` (section « À propos ») → `router.navigate(["versions"])`.
  - **Source des notes** : un util **`utils/release-notes.ts`** (tableau de `{ version, current?, changes: string[] }`), exporté et consommé par la page. La version marquée « Actuelle » = `VersionHandlerService.appVersionDisplay`.
  - **Contenu** :
    - **1.0** — première version (rien de plus à dire).
    - **1.1** — liste des points revus (à dresser à partir de ce TODO une fois implémenté : longueur des réponses, personnages secondaires, mémoire, troncature prompt image, StatusBar, padding/forms, icônes des bulles, etc.).

## 10 — Bump de version 1.1 🟢

- **`VersionHandlerService`** : `appVersionDisplay` « 1.0 » → « **1.1** ». **Ne pas toucher** à `appVersion` (reste `3` : entier de format de bdd, à n'incrémenter que pour une migration).
- **Android (Capacitor)** : `android/app/build.gradle` → `versionName "1.0"` → « **1.1** » et `versionCode 1` → `2` (le `versionCode` doit augmenter à chaque build distribué).

---

## Récapitulatif de l'ordre

| Ordre | Tâche | Effort | État |
| ----- | ----- | ------ | ---- |
| 1 | Tronquer le prompt image à ≤ 2048 (avatar + scène) | 🟢 🐞 | ✅ Fait |
| 2 | Réponses du chat moins longues (consigne de concision) | 🟡 | ✅ Fait |
| 3 | Mémoire : écriture plus fiable au fil de la conversation | 🟡 | ✅ Fait |
| 3b | Mémoire : empêcher la fuite du bloc dans la conversation (parser tolérant) | 🟢 🐞 | ✅ Fait |
| 4 | Faire parler les personnages secondaires | 🟡 | ✅ Fait |
| 5 | Création : ne pas brider les personnages secondaires | 🟢 | ✅ Fait |
| 6 | /character-form : `padding: 16px 16px 0px` | 🟢 | ✅ Fait |
| 7 | Bulles de chat : icônes à gauche | 🟢 | ✅ Fait |
| 8 | StatusBar Android adaptée au thème | 🟢 | ✅ Fait (à valider mobile) |
| 9 | Sous-page /versions (notes de version) | 🟡 | ✅ Fait |
| 10 | Bump 1.1 (appVersionDisplay + versionName/versionCode Android) | 🟢 | ✅ Fait |

---

## Décisions tranchées

1. **#2 Longueur** : paragraphes de narration de **~30 mots max**, **3 paragraphes max** (maximums, non obligatoires). **Pas** de `maxOutputTokens` dur.
2. **#3 Mémoire** : alléger la consigne (« conserver les points importants » au lieu de « si un élément durable change »). **Ne pas** toucher à `MAX_MESSAGES`.
3. **#5 Création** : retirer la ligne restrictive et **ne rien spécifier** ; l'IA décide ce qui est pertinent.
4. **#9 Notes de version** : stocker dans `utils/release-notes.ts`.
