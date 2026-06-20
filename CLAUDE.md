# EchoAI — Conventions de code

Application Ionic 8 / Angular 20 (standalone) : un chatbot IA où l'utilisateur crée des
personnages (chacun avec sa personnalité) et discute avec eux. Le modèle IA est Gemini
(palier gratuit), appelé en HTTP. Ce document recense les conventions de code du projet.
Il est agrémenté au fur et à mesure.

---

## Général

- **Tous les noms d'éléments de code** (méthodes, variables, services, pages, composants, types…) sont en **anglais**. Seuls les libellés destinés à l'utilisateur (textes affichés) peuvent être en français.
- **Tous les commentaires de code sont en français.**
- **Strings entre doubles guillemets** (`"`) en priorité, plutôt que des simples (`'`). **Exception** : ce qui est généré par Ionic/Angular reste tel quel, en simples guillemets — notamment les chemins des `import` et les métadonnées du décorateur `@Component` (`selector`, `templateUrl`, `styleUrls`). On ne convertit pas l'existant.
- **Fichiers `.spec.ts`** : on garde toujours le `.spec.ts` généré pour chaque **page**, **composant** et **service**.

---

## Documentation

- **`TODO.md`** (racine) et **`README.md`** (racine) doivent rester **à jour à tout moment**.
- **`TODO.md`** : à chaque fonctionnalité avancée ou terminée, mettre à jour son état (cocher / déplacer / retirer) au fur et à mesure de l'implémentation.
- **`README.md`** : à chaque évolution du projet (nouvelle fonctionnalité, changement d'installation, de configuration ou d'architecture), répercuter le changement dans le README.

---

## Frontend

### Structuration des fichiers
Sous `src/app/` :
- `services/` : les **services**, en fichiers plats `xxx-service.ts` (+ `xxx-service.spec.ts`), **sans** sous-dossier.
- `components/` : les **composants**, chacun dans son sous-dossier `xxx/` : `xxx.component.ts`, `.html`, `.scss`, `.spec.ts`.
- `pages/` : les **pages**, chacune dans son sous-dossier `xxx/` : `xxx.page.ts`, `.html`, `.scss`, `.spec.ts`.
- `utils/` : fonctions utilitaires pures, sans `.spec.ts`.

Autres : `src/environments/` (variables d'environnement), `src/assets/` (images).

### Variables d'environnement
- Définies dans `src/environments/environment.ts` (et `environment.prod.ts`).
- Nommées au format `NOM_VARIABLE` (majuscules, underscore). Ex. : `GEMINI_API_KEY`, `GEMINI_MODEL`.
- **La vraie clé API ne doit jamais être commitée** : `environment.ts` est dans le `.gitignore`, et un `environment.example.ts` documente les variables sans valeur secrète.

### Imports dans un `.ts` de page ou de composant
Trois blocs séparés par une ligne vide :
1. Les imports framework (Angular, Ionic, RxJS…).
2. *(ligne vide)* puis les **services** (ordre alphabétique).
3. *(ligne vide)* puis les **composants** (ordre alphabétique).

### Services
- Un service est **suffixé par `Service`** : classe `XxxService`, fichier `xxx-service.ts` (kebab + `-service`).
- Objectif : l'import d'un service contient toujours le mot « Service », ce qui le distingue d'un type, d'un composant, etc.
- **Séparation des responsabilités IA** : `GeminiService` ne fait que l'**appel HTTP brut** au modèle **texte** (Gemini) ; `ImageService` fait l'appel **image** (Cloudflare Workers AI / FLUX), découplé de Gemini ; `ChatService` **orchestre** (construit le prompt système + l'historique, persiste les messages). Changer de fournisseur texte ne touche que `GeminiService` + l'`environment` ; idem image et `ImageService`.

### Inputs / Outputs
- Utiliser l'API **signal** : `title = input.required<string>();` (import de `input`) plutôt que `@Input()`.
  Dans le template, un input signal se lit en l'appelant : `{{ title() }}`.
- Pour les sorties : utiliser `output()` plutôt que le décorateur `@Output`.

### Constructeur et méthodes
- Les **services** sont injectés en `private` dans le constructeur (dependency injection).
- La **seule** méthode autorisée au-dessus du constructeur est `ionViewWillEnter`.
- `ionViewWillEnter` ne contient **pas de logique** : uniquement des appels à d'autres méthodes.
- Code à exécuter au chargement : `ionViewWillEnter` pour les **pages**, `ngOnInit` pour les **composants**.

### Templates HTML des pages
- **Pas** de `<ion-header>` ni `<ion-footer>` (sauf exception explicite, ex. envelopper `app-header`).
- Le `<ion-content>` porte toujours la classe `<nom-de-la-page>-content`.
- **Éviter les balises `<ion-xxx>`** : privilégier du HTML classique quand c'est possible (et ne pas importer les `IonXxx` correspondants dans le `.ts`). **Exception** : `<ion-icon>` est autorisé pour les icônes (header, navbar…) ; les icônes sont enregistrées via `addIcons({ … })` dans le constructeur du composant standalone.
- **Control flow** : utiliser `@for`, `@if`, `@switch` — **pas** `*ngFor`, `*ngIf`.
- **Classes sur toutes les balises** : chaque balise porte un nom de classe. **Exception** : les fichiers HTML générés de base (ex. `app.component.html`) sont laissés tels quels.
- **Boîtes de dialogue** : utiliser les modales applicatives `app-modal` (coquille) et `app-confirm-modal` (confirmation) — **jamais** `AlertController` (pop-ups natifs). Chaque page pilote ses modales via un état local.

### Fichiers SCSS
- Les classes sont ordonnées selon leur **ordre d'apparition dans le HTML**.
- Pas de couleur codée en dur : passer par une variable CSS `var(--xxx)`.

### Stockage des données utilisateur
- Pour manipuler l'entrée `"db"` du stockage : **toujours passer par `DatabaseService`**, jamais par `StorageService`. `DatabaseService` est l'interface dev-friendly (tables/lignes) pour lire/écrire les données utilisateur.
- `StorageService` est une **boîte noire** qu'on ne touche pas quand on peut l'éviter.
- Tables de la db : `characters` (les personnages), `conversations` (une conversation par personnage), `personas` (les personas de l'utilisateur) et `usage` (suivi d'utilisation des modèles).

---

## GitHub

- **Jamais** la clé API dans un commit (`environment.ts` git-ignoré).
- **Jamais** de trailer `Co-Authored-By: Claude` dans les commits.
