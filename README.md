# EchoAI

**EchoAI** est une application mobile où l'utilisateur crée des **personnages** (chacun avec sa propre personnalité) et discute avec eux. Chaque réponse est générée par l'IA **Gemini** de Google, appelée en HTTP.

Construit avec **Ionic 8** et **Angular 20** (composants standalone). Les données utilisateur sont stockées **localement** sur l'appareil (Ionic Storage), sans serveur ni compte.

---

## Fonctionnalités

> Pour l'instant l'application couvre l'essentiel ; d'autres fonctionnalités suivront.

### Personnages
- **Créer un personnage** : un nom, une « personnalité » (instructions envoyées à l'IA comme *system prompt*), un **message d'accueil** (obligatoire), et des **détails optionnels** (âge, apparence, relation initiale avec l'utilisateur, ton rôle dans l'histoire, goûts et préférences, histoire / passé, univers / cadre, façon de parler, personnages qu'il connaît). Une couleur d'avatar est attribuée au hasard.
- **Balises `{char}` et `{user}`** : utilisables dans n'importe quel champ (et la salutation), elles sont remplacées à la volée par le nom du personnage et celui du persona actif. Renommer un personnage ne se fait alors qu'à un seul endroit (le champ « nom »), tout le reste suit.
- **Création assistée par IA** : à partir d'un simple brouillon (« décris ton idée en quelques mots »), l'IA génère une fiche complète et cohérente qui pré-remplit tous les champs du formulaire — entièrement retouchables ensuite. Pour l'apparence, elle décrit uniquement le physique, et elle nomme réellement les personnages secondaires (nom, fonction, relation). Un champ **« Ton rôle dans l'histoire »** (au brouillon) permet de décrire l'utilisateur (`{user}`) afin que l'IA ne le confonde pas avec le personnage à créer ; l'IA le reformule dans le champ persistant **« Ton rôle »** de la fiche, conservé et transmis à l'IA à chaque message.
- **Photo de profil générée** : l'IA peut générer une photo de profil du personnage via **Cloudflare Workers AI** (modèle FLUX, palier gratuit). Activée dès que les identifiants Cloudflare sont renseignés ; sinon une pastille colorée sert d'avatar.
- **Lister les personnages** : la liste affiche tous les personnages, du plus récent au plus ancien.
- **Modifier un personnage** : toucher une carte dans la liste ouvre sa fiche (tous les champs éditables à tout moment).
- **Supprimer un personnage** : avec confirmation ; la conversation associée est supprimée en même temps.

### Personas
- **Définir des personas** : l'utilisateur crée des personas (nom + **genre** + **âge** facultatif + description : qui il est, son histoire, ses pouvoirs… + **apparence** physique facultative) qu'il peut incarner. Genre, âge et apparence sont transmis à l'IA pour des réponses plus fidèles et cohérentes dans la durée. Un persona **par défaut** (« Moi ») existe toujours : au premier lancement, l'application propose de renseigner son nom, son genre, et — facultativement — son âge, sa description et son apparence. Il est non supprimable mais reste entièrement modifiable (ces mêmes champs).
- **Incarner un persona** : chaque conversation a **toujours** un persona actif (le persona par défaut au départ) ; on peut en changer via une liste qui affiche nom **et** description. Ces infos sont transmises au personnage IA.

### Conversation
- **Discuter avec un personnage** : chaque personnage a sa propre conversation, persistée localement. On démarre une discussion via **« + Nouvelle conversation »** dans l'onglet Conversations (sélection du personnage), ou en rouvrant une conversation existante.
- **Message d'accueil** : premier message affiché (côté IA) à l'ouverture de la conversation, pour planter le décor. Obligatoire à la création ; suit le format des messages (narration, dialogue) — y compris quand il est généré par l'IA.
- **Réponses de l'IA** : les messages sont envoyés à Gemini avec la personnalité du personnage et l'historique de la conversation comme contexte. Les réponses sont volontairement **concises** (longueur de narration bornée) pour garder des échanges vivants.
- **Narration** : les passages encadrés d'astérisques (`*la porte grince*`) sont mis en forme (italique, grisé) pour distinguer la narration des paroles. La narration est une voix de narrateur (3ᵉ personne) : l'histoire peut continuer à décrire la scène même quand le personnage n'est pas là.
- **Dialogue** : l'IA préfixe les répliques par le nom de celui qui parle et met les paroles entre guillemets (`Alice : "Bonjour"`), pratique quand plusieurs personnages interviennent. L'IA peut faire parler les **personnages secondaires** présents dans la scène, pas seulement le personnage principal.
- **Affichage optimiste** : le message de l'utilisateur apparaît immédiatement, puis la réponse du modèle ; la zone défile automatiquement vers le dernier message. Pendant que l'IA rédige, une **étoile animée** signale l'attente.
- **Zone de saisie** : le champ revient à la ligne pour les messages longs et s'étire jusqu'à trois lignes (puis devient défilable) ; l'envoi se fait avec la touche Entrée du clavier (pas de bouton « Envoyer »).
- **Régénérer / supprimer / réinitialiser** : on peut régénérer la dernière réponse de l'IA, ou supprimer un message (et tous les suivants, avec confirmation). Une conversation ne se termine jamais sur un message de l'utilisateur : supprimer une réponse de l'IA retire aussi le message qui l'avait déclenchée. Ces deux actions **rembobinent les jalons** nés dans les messages écartés (chaque jalon retient le message qui l'a produit) ; les jalons ajoutés à la main restent, eux, intacts. La salutation (premier message) n'est pas supprimable ; pour repartir de zéro, un bouton ↺ **réinitialise** la conversation (efface messages et mémoire, puis remet la salutation).
- **Éditer un message** : un bouton ✎ permet de corriger le texte de n'importe quel message (le tien ou celui de l'IA), sauf la salutation, via une modale. L'édition **ne régénère pas** les messages suivants : elle modifie l'historique, qui en tient simplement compte pour la suite.
- **Aparté hors-personnage (OOC)** : un bouton 📝 ajoute une consigne au modèle (ton, direction de l'histoire…) sous forme d'**encart distinct**. Elle reste dans la conversation et est transmise à l'IA comme instruction à respecter, **sans casser le récit ni déclencher de réponse**. Éditable et supprimable comme un message ; une conversation peut se terminer sur un aparté.
- **Passer son tour** : un bouton laisse le personnage IA enchaîner un message de lui-même, sans qu'on ait à écrire.
- **Illustrer la scène** : un bouton génère une image illustrant l'**instant présent** de la conversation, affichée dans le fil comme un message. Pipeline en deux temps : **Gemini** transforme d'abord le contexte (qui est présent, ce qu'ils font, le lieu — en s'appuyant sur l'apparence du personnage et celle du persona s'il est dans la scène) en un prompt visuel **en anglais** et **épuré** (pour passer au mieux les filtres de contenu), puis **Cloudflare Workers AI** (FLUX) génère l'image. Une illustration consomme donc **une requête Gemini + une requête Cloudflare**. Le bouton est masqué si les identifiants Cloudflare ne sont pas renseignés. (Génération text→image : pas de cohérence d'apparence garantie ; les scènes très explicites peuvent rester refusées par Cloudflare.)
- **Mémoire permanente** : l'IA tient à jour, d'elle-même, les éléments durables de l'histoire (lieu courant, situation actuelle, relation, jalons vécus, consignes) — elle **consolide** l'état courant à chaque réponse (fusion des doublons, même reformulés, et oubli de ce qui est dépassé), en français et sans rien afficher de technique. Les **jalons** font exception : ils s'**ajoutent** un par un au fil des événements marquants (mode *delta* : l'IA n'émet que le nouveau jalon du tour, l'application l'empile sans jamais le réécrire). Un écran dédié (bouton 🧠) permet de **consulter**, **ajouter**, **éditer** ou **oublier** un souvenir ; les **jalons** et **consignes** y sont **repliables** (repliés par défaut).
- **Mode démo (sans clé API)** : tant qu'aucune clé Gemini n'est configurée, l'application répond avec un message simulé — l'interface reste utilisable pour le développement.

### Apparence & paramètres
- **Thèmes** : trois thèmes au choix (Défaut, Clair, Sombre), appliqués instantanément et mémorisés. Sur Android, la **barre d'état** s'accorde au thème actif (couleur de fond et contraste des icônes).
- **Notes de version** : une sous-page de Paramètres liste les mises à jour par version (la plus récente en haut, marquée « Actuelle »).

### Robustesse & suivi
- **Repli automatique des modèles (texte)** : la génération de texte s'appuie sur une **liste** de modèles Gemini ; si le quota d'un modèle est épuisé (`429`), l'application bascule automatiquement sur le suivant. (La génération d'image utilise Cloudflare Workers AI, un seul modèle.)
- **Réponses vides / bloquées** : un filtre de contenu non configurable de Google renvoie parfois une réponse vide. L'application **relance automatiquement** (jusqu'à 3 fois) ; si la réponse reste vide, un message clair s'affiche et **aucun message vide n'est enregistré**.
- **Suivi d'utilisation** : une page debug (bouton 📊) affiche, pour la journée, les **requêtes** par modèle (texte sous la forme « X / max par jour », image en nombre de requêtes). Un modèle dont le quota est épuisé est signalé par un **contour rouge**, jusqu'à sa réinitialisation quotidienne (minuit Pacifique pour Gemini, 00:00 UTC pour Cloudflare) — dont l'heure est affichée **convertie dans le fuseau local**. Tous les appels à l'IA sont comptés (réponses, tour passé, prompt d'illustration et image, création de fiche) ; les **tokens** (texte) et **neurons** (image) sont estimés et stockés mais **non affichés**. ⚠️ Ces chiffres sont une **estimation locale**, pas une lecture officielle du quota.

---

## Prérequis

- [Node.js](https://nodejs.org/) (LTS recommandé)
- [Ionic CLI](https://ionicframework.com/docs/cli) (optionnel) : `npm install -g @ionic/cli`

## Installation

```bash
npm install
```

## Configuration de la clé API

La clé API Gemini n'est **jamais** versionnée. Le dépôt fournit un modèle :

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
```

Renseigne ensuite ta clé dans `src/environments/environment.ts` :

| Variable           | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `GEMINI_API_KEY`     | Clé API obtenue sur [Google AI Studio](https://aistudio.google.com) |
| `GEMINI_MODELS`      | Liste de modèles de texte `{ id, rpd, thinkingBudget }`, du préféré au moins prioritaire (repli automatique sur `429`/`503`/`404`). `rpd` = requêtes/jour du palier gratuit (saisi à la main, affiché dans le suivi) ; `thinkingBudget` = budget de réflexion en tokens (`0` désactive le *thinking* ; certains modèles imposent un minimum). Ex. : `{ id: "gemini-3.5-flash-lite", rpd: 500, thinkingBudget: 512 }` |
| `CLOUDFLARE_ACCOUNT_ID` | ID de compte Cloudflare (génération d'image). Vide = génération d'image désactivée |
| `CLOUDFLARE_API_TOKEN`  | Token API Workers AI (dash.cloudflare.com → AI → Workers AI → « Use REST API ») |
| `CLOUDFLARE_IMAGE_MODEL`| Modèle d'image. Ex. : `@cf/black-forest-labs/flux-1-schnell` |
| `GEMINI_API_URL`     | Racine de l'API Gemini                                             |

> Sans clé, l'application fonctionne en **mode démo** (réponses simulées).

## Lancer l'application

```bash
npm start          # serveur de développement (http://localhost:4200)
npm run build      # build de production (dans www/)
npm test           # tests unitaires (Karma + Jasmine)
npm run lint       # analyse statique (ESLint)
```

---

## Architecture

Sous `src/app/` :

- **`pages/`** — les écrans : `welcome` (splash + initialisation au lancement), et les onglets `characters` (personnages), `conversations` (liste des discussions), `personas`, `tokens` (suivi d'utilisation des modèles), `settings` (paramètres) ; plus les sous-écrans `character-form` (création/édition), `chat` (conversation), `memory` (mémoire d'une conversation), `persona-form` (création/édition), `versions` (notes de version).
- **`components/`** — composants réutilisables : `header` (en-tête de page, titre + retour optionnel), `navbar` (barre d'onglets en bas), `modal` / `confirm-modal` (boîtes de dialogue applicatives, en remplacement des pop-ups natifs), `character-card`, `message-bubble`.
- **`services/`** — la logique applicative, avec une séparation nette des responsabilités IA :
  - `GeminiService` — uniquement l'appel HTTP brut au modèle **texte** Gemini, avec repli sur une liste de modèles en cas de quota épuisé.
  - `ImageService` — génération d'image via **Cloudflare Workers AI** (FLUX), découplé de Gemini.
  - `ChatService` — orchestration (assemble le prompt système via l'util `buildSystemPrompt`, construit l'historique, persiste les messages).
  - `CharacterService` — gestion des personnages.
  - `PersonaService` — gestion des personas incarnés par l'utilisateur.
  - `DatabaseService` — interface dev-friendly (tables/lignes) pour le stockage local.
  - `StorageService` — couche de stockage bas niveau (Ionic Storage).
  - `MessageService` — retours UI brefs (toasts d'information et d'erreur).
  - `UsageService` — suivi (estimé) de l'utilisation des modèles : compteurs de requêtes et de tokens par jour.
  - `ThemeService` — gestion des thèmes (Défaut, Clair, Sombre), appliqués via une classe sur `<body>` et mémorisés localement ; accorde aussi la barre d'état Android au thème actif.
  - `VersionHandlerService` — montées de version du **format de la bdd** (`appVersion`, migrations au démarrage) et **version commerciale** (`appVersionDisplay`) affichée dans les notes de version.
- **`utils/`** — fonctions utilitaires pures.

Changer de modèle ou de fournisseur d'IA **texte** ne doit toucher que `GeminiService` et l'`environment` ; de même pour l'**image**, seuls `ImageService` et l'`environment` sont concernés.

Les conventions de code détaillées sont décrites dans [`CLAUDE.md`](./CLAUDE.md).
