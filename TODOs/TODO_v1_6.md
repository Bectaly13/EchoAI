# TODO v1.6 — Correctifs image / Gemini / perf + champ « ton rôle »

**Statut : livré en 1.6** — les 5 points implémentés et vérifiés (tsc + lint + build).

Version **mineure** (`1.6`) : essentiellement des correctifs, mais introduit un
nouveau champ persistant sur le personnage avec **migration de bdd** (`appVersion` 4 → 5).

Points ordonnés **par priorité** (l'app est aujourd'hui à peine utilisable : texte + image cassés).

---

## 1. Texte Gemini : plantages « échec de génération / régénération » (CRITIQUE)

### Constat / symptôme
Les réponses texte échouent la majorité du temps. Tests réels effectués sur l'API (clé du projet) :

- `gemini-3.1-flash-lite` : **fonctionne** (200) — mais en mode « thinking » implicite (défaut),
  renvoie **très souvent un 503 `UNAVAILABLE`** (« high demand »).
- `gemini-2.5-flash` (3ᵉ de la liste de repli) : **404** — « no longer available to new users,
  update to models/gemini-3.8-flash ». **Modèle mort.**
- Avec `thinkingConfig.thinkingBudget: 0` : réponse propre à chaque essai, 1 seule `part` texte,
  plus rapide, moins de tokens, **aucun 503** observé sur ~6 essais.

Deux causes cumulées :
1. **La logique de repli (`GeminiService.withFallback`) ne bascule au modèle suivant que sur `429`.**
   Un `503` (surcharge) ou un `404` (modèle mort) est **levé immédiatement** → « échec ». Donc dès
   qu'un 503 tombe (fréquent en mode thinking) ou dès qu'on atteint le `gemini-2.5-flash` mort, tout casse.
2. **Le mode « thinking » des modèles 3.x** est instable (503 fréquents) et inutile pour du roleplay.

### Méthode
1. **Désactiver le thinking** : ajouter `generationConfig.thinkingConfig.thinkingBudget: 0` dans les
   deux appels (`generate` et `generateStructured`). Supprime les 503, accélère, réduit les tokens.
2. **Mettre à jour la liste `GEMINI_MODELS`** (`environment.ts` + `environment.example.ts`) : retirer le
   `gemini-2.5-flash` mort. Liste proposée (tous testés OK ce jour) :
   - `gemini-3.5-flash-lite` (rpd 500) — le « nouveau » flash-lite
   - `gemini-3.1-flash-lite` (rpd 500) — repli
   - `gemini-2.5-flash-lite` (rpd 500) — repli supplémentaire
   → ~1500 req/j cumulées, on retrouve (et dépasse) les 500/j d'avant.
3. **Rendre `withFallback` résilient** : basculer au modèle suivant non seulement sur `429`, mais aussi
   sur `503` (surcharge) et `404` (modèle mort). Ne remonter l'erreur que si **tous** les modèles
   échouent, ou immédiatement pour les erreurs de config non récupérables (`400`/`401`/`403`).
   Ne comptabiliser comme « épuisé » (UsageService) que le vrai `429`, pas le 503/404.

### Limites
- Les rpd (500) sont saisis à la main (l'API ne les expose pas) et Google les ajuste sans préavis :
  valeur indicative pour la page de suivi, pas une garantie.
- Désactiver le thinking peut légèrement réduire la « profondeur » de raisonnement — négligeable, voire
  bénéfique, pour du jeu de rôle conversationnel court.

### Questions à trancher
- **Q1.1** Désactive-t-on le thinking (`thinkingBudget: 0`) ? *(recommandé : oui)*
- **Q1.2** Liste/ordre des modèles ci-dessus OK ? Garde-t-on `gemini-2.5-flash-lite` en 3ᵉ repli ?
- **Q1.3** OK pour que `withFallback` bascule aussi sur 503/404 (et ne remonte qu'après avoir tout tenté) ?

---

## 2. Génération d'image cassée : `width`/`height` refusés (CRITIQUE)

### Constat / symptôme
Test réel sur l'API Cloudflare (`@cf/black-forest-labs/flux-1-schnell`) :
```
{"errors":[{"message":"AiError: Bad input: Additional or unevaluated properties
'/width, /height' at '/' not allowed","code":5006}],"success":false}
```
Sans `width`/`height` (en gardant `steps`), l'image se génère correctement. Le nouveau schéma du
modèle **n'accepte plus** ces deux paramètres.

### Méthode
- Dans `ImageService.generate`, retirer `width` et `height` du corps de requête (garder `prompt` + `steps`).
- Vérifier la **taille réelle** de l'image renvoyée par défaut (décoder le JPEG de test) et **ajuster le
  commentaire + l'estimation de neurons** (`NEURONS_PER_TILE`/`NEURONS_PER_IMAGE`, aujourd'hui calés sur
  512×512 = 1 tuile). Si le défaut est 1024×1024 (4 tuiles), le coût estimé du suivi doit être corrigé.

### Limites
- L'estimation de neurons n'impacte que l'affichage du suivi d'utilisation, pas le fonctionnement.
- On perd le contrôle de la résolution (imposée par le modèle) : acceptable pour un avatar.

### Questions à trancher
- **Q2.1** Aucune — fix mécanique. (Je mesure la taille réelle et j'ajuste l'estimation en implémentant.)

---

## 3. Champ « ton rôle » persistant sur le personnage + migration (NOUVEAU)

### Constat / symptôme
La génération assistée prend déjà un input « ton rôle » (rôle de `{user}` dans l'histoire), mais il est
**transitoire** (jeté après génération, comme le brouillon `{char}`). Résultat : ce rôle n'est presque
jamais fidèlement retranscrit dans la fiche finale, faute de champ persistant pour l'accueillir.

### Décision (pipeline validée)
**Deux champs distincts, de même libellé** — l'IA fait le pont :
- Section « brouillon » : conserve ses **deux inputs transitoires** (brouillon `{char}` + brouillon du rôle
  de `{user}`), écrits à la va-vite et **jetés** après génération.
- La génération IA **reformule proprement** le brouillon du rôle de `{user}` pour **remplir un nouveau champ
  persistant « Ton rôle »** dans la fiche (comme elle remplit tous les autres champs).
- Le champ persistant « Ton rôle » est aussi **éditable à la main** et **envoyé à l'IA à chaque message**.

### Méthode
1. **Type** : ajouter `userRole?: string` à `Character` et à `CharacterDraft` (character-service.ts).
2. **Formulaire** (character-form.page.ts + .html) :
   - Renommer la variable transitoire actuelle `userRole` → `userRoleBrief` (brouillon, jeté), pour libérer
     le nom `userRole` au **champ persistant** (aligné sur le modèle de données).
   - Ajouter le champ persistant « Ton rôle » (optionnel) dans la fiche, éditable comme les autres :
     chargé dans `loadIfEditing`, réinitialisé dans `resetForm`, inclus dans `save`.
   - `generateDraft` : `this.userRole = draft.userRole ?? ""` (pré-remplissage depuis la génération).
3. **Génération** (build-draft-prompt.ts + character-service.ts) :
   - Ajouter `userRole` à `CHARACTER_DRAFT_SCHEMA` (+ `propertyOrdering`) et à `normalizeDraft`.
   - Dans le prompt, instruire l'IA à **reformuler** le brouillon du rôle de `{user}` en une description
     propre du champ `"userRole"` (rôle/place de `{user}` dans l'histoire), sans en faire le personnage.
4. **Prompt système** (build-system-prompt.ts) : injecter `userRole` dans le **bloc UTILISATEUR (PERSONA)**
   sous une ligne dédiée (ex. « Rôle de l'utilisateur dans l'histoire : … »). `initialRelationship` reste
   dans le bloc PERSONNAGE (relation *du personnage* à l'utilisateur) : angles distincts, on garde les deux.
5. **Migration `updateToV5`** (`appVersion` 4 → 5) : pour chaque personnage existant, `userRole = ""`.
   Câbler `if (userVersion < 5) await this.updateToV5()` et passer `appVersion = 5`.

### Limites
- Le champ étant optionnel (`userRole?`), `undefined` serait déjà inoffensif ; la migration à `""` est
  surtout de la propreté/explicité (demandée). On la fait.
- Deux champs « Ton rôle » (brouillon transitoire vs fiche persistante) : acceptable puisque le premier
  disparaît après création (dans la section génération) et le second vit dans la fiche.
- Léger recouvrement conceptuel avec `initialRelationship` : traité en les gardant sur des angles
  différents (rôle de `{user}` vs relation du personnage). À surveiller à l'usage.

### Questions à trancher
- **Q3.1** Placement du champ persistant « Ton rôle » dans la fiche : juste après « Relation initiale » ?
  *(défaut retenu : oui — champs voisins car tous deux relatifs à `{user}`)*

---

## 4. Prompt de génération : « apparence » = physique uniquement, sans vêtements

### Constat / symptôme
`build-draft-prompt.ts` (champ `appearance`) demande le physique PUIS « les vêtements et accessoires…
brièvement ». On veut **uniquement le physique**, sans vêtements. Formulation **positive** (pas de « ne
mets pas les habits » — effet éléphant rose) : on demande simplement l'apparence physique.

### Méthode
- Réécrire la consigne du champ `appearance` : ne décrire que le physique (cheveux, yeux, taille,
  corpulence, traits du visage, âge apparent…). Supprimer toute mention de vêtements/accessoires.

### Limites
- N'affecte que les **nouvelles** générations ; les personnages existants gardent leur apparence actuelle.
- `build-image-prompt.ts` réutilise `appearance` pour l'avatar : sans vêtements dans ce champ, la tenue
  viendra (ou non) du reste du prompt image. À vérifier que l'avatar reste cohérent (habillé).

### Questions à trancher
- **Q4.1** Aucune — ajustement de formulation.

---

## 5. Lenteur de chargement des grosses listes (personnages / conversations)

### Constat / symptôme
`DatabaseService.get()` relit **toute la db** depuis le storage à **chaque** appel (pas de cache mémoire),
et les pages font N accès **séquentiels** :
- `characters.page.ts` → `resolveUserNames` : boucle avec, par personnage, `getActivePersonaId` **puis**
  `personaService.get` → 2 lectures db/perso en série (≈ 1 + 2N lectures).
- `conversations` → `ChatService.listConversations` : boucle avec `characterService.get` par conversation
  → 1 lecture db par conversation (≈ 1 + N lectures).

Le vrai goulot : **O(N) relectures complètes de la db en série**, pas le rendu.

### Méthode
Approche **recommandée** (sûre, sans risque d'invalidation de cache) : supprimer les lectures par item.
- `listConversations` : lire **une fois** la table `conversations` **et une fois** `characters`, construire
  une `Map` par id, puis mapper (0 lecture par item).
- `resolveUserNames` : lire **une fois** `conversations` (pour les personas actifs) **et une fois**
  `personas`, construire les maps, puis résoudre en mémoire.
→ Passe de O(N) lectures à **O(1)** par page.

Option complémentaire (plus large mais plus risquée) : cache mémoire de la db dans `DatabaseService`
(lecture une fois, invalidation à chaque `update`). Gain global mais logique d'invalidation à sécuriser.

### Limites
- « Chargement un par un pour aller plus vite » (idée initiale) : le rendu progressif améliorerait le
  *ressenti* mais pas le temps total ; la vraie cause est les relectures db en série. On la traite à la racine.
- L'approche batch touche `ChatService`/pages seulement ; l'option cache touche la « boîte noire »
  `DatabaseService` (à éviter si le batch suffit).

### Questions à trancher
- **Q5.1** On part sur le **batch** (maps en mémoire, sans toucher `DatabaseService`) ? *(recommandé)*
  Ou on ajoute aussi le cache mémoire dans `DatabaseService` ?

---

## Clôture de version (à la fin)
- `appVersion` = **5** (+ `updateToV5`), `appVersionDisplay` = **"1.6"**.
- `android/app/build.gradle` : `versionName "1.6"`, `versionCode` +1 (→ 20).
- Entrée en tête de `RELEASE_NOTES` (utils/release-notes.ts) listant les points revus.
- README à jour si nécessaire (modèles Gemini, champ « ton rôle »).
- Commit = nom de version seul (`1.6`), sans trailer `Co-Authored-By`, puis push.
