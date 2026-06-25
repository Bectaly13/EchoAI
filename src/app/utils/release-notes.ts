// Notes de version affichées dans la sous-page /versions. La plus récente en tête.
// À enrichir d'une entrée à chaque nouvelle version (cf. appVersionDisplay du
// VersionHandlerService). La version « Actuelle » est déterminée par la page à
// partir de appVersionDisplay (pas de marqueur en dur ici).

export interface ReleaseNote {
  // Numéro de version commercial (ex. « 1.1 »).
  version: string;
  // Points revus dans cette version (liste vide pour la toute première version).
  changes: string[];
}

// Ordre d'affichage : la plus récente en premier.
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.4.3",
    changes: [
      "Ajustements mineurs du formulaire de persona (espacement de la liste des conversations, mention « facultatif » sur la description)."
    ]
  },
  {
    version: "1.4.2",
    changes: [
      "Aperçu des personnages : les balises {char} et {user} y affichent maintenant les vrais noms (personnage et persona de la conversation).",
      "Boutons « Nouveau personnage », « Nouvelle conversation » et « Enregistrer » toujours accessibles, plaqués en bas de l'écran.",
      "Persona par défaut (« Moi ») : tu peux désormais lui donner une description et une apparence, proposées (facultatives) dès la première connexion."
    ]
  },
  {
    version: "1.4.1",
    changes: [
      "Champs « Ce qu'il aime » et « Ce qu'il n'aime pas » fusionnés en un seul « Goûts et préférences » (mise à jour automatique des personnages existants).",
      "Formulaire de personnage : bouton « Enregistrer » toujours accessible (collé en bas), apparence placée en premier dans les détails.",
      "Ouvrir « Nouveau personnage » repart d'un formulaire vierge (plus de saisies résiduelles)."
    ]
  },
  {
    version: "1.4",
    changes: [
      "Fiches personnage enrichies : nouveaux champs Scénario, Univers / cadre, Façon de parler et Histoire / passé (tous optionnels).",
      "Balises {char} et {user} : écris-les dans n'importe quel champ, elles sont remplacées par le nom du personnage et le tien (persona actif) — pratique pour renommer un personnage en un seul endroit.",
      "Création par IA améliorée : apparence centrée sur le physique, et personnages secondaires vraiment nommés (nom, fonction, relation) plutôt que des rôles génériques.",
      "La génération de fiche propose désormais aussi un scénario de départ."
    ]
  },
  {
    version: "1.3",
    changes: [
      "Mémoire fidèle à l'historique : supprimer une partie de la conversation retire désormais les jalons qui y étaient nés, et régénérer une réponse efface le jalon qu'elle avait posé.",
      "Les jalons que tu ajoutes toi-même (écran mémoire) ne sont jamais retirés automatiquement : ils restent sous ton contrôle."
    ]
  },
  {
    version: "1.2.5",
    changes: [
      "Jalons de l'histoire fiabilisés : ils s'ajoutent un par un au fil des événements marquants, sans jamais fusionner ni se réécrire.",
      "Les personas ont un champ « apparence » (facultatif) pour décrire ton physique et gagner en cohérence et en immersion.",
      "Zone de saisie repensée : les messages longs reviennent à la ligne et le champ s'étire jusqu'à trois lignes ; l'envoi se fait avec la touche Entrée du clavier (plus de bouton « Envoyer »)."
    ]
  },
  {
    version: "1.2.4",
    changes: [
      "Jalons de l'histoire empilés correctement (un par événement), au lieu d'être fusionnés en une seule entrée.",
      "Petit ajustement d'espacement sur l'écran mémoire."
    ]
  },
  {
    version: "1.2.3",
    changes: [
      "Fenêtres de sélection : le titre et les boutons restent visibles même quand la liste est longue.",
      "Les personas ont un genre (homme / femme / autre), pris en compte dans les réponses de l'IA.",
      "Description de persona mieux interprétée par l'IA (attribuée à toi, pas au personnage).",
      "Page Tokens : heure de réinitialisation du quota affichée pour chaque modèle (dans ton fuseau horaire)."
    ]
  },
  {
    version: "1.2.2",
    changes: [
      "Salutations générées par l'IA mieux mises en page (sauts de ligne entre narration et dialogues).",
      "Toucher un personnage ouvre sa fiche (édition) ; on démarre une discussion via « + Nouvelle conversation » dans l'onglet Conversations.",
      "Espacements revus (moins de vide en bas des écrans, listes plus régulières).",
      "Écran d'accueil : barre d'état accordée au fond de l'écran."
    ]
  },
  {
    version: "1.2.1",
    changes: [
      "Les jalons de l'histoire s'accumulent désormais correctement (un vrai journal des événements vécus), au lieu de se réduire à une seule entrée.",
      "Seuls les faits vraiment marquants deviennent des jalons.",
      "Nouvelle entrée de mémoire « Situation actuelle » : où en est l'histoire à l'instant, distincte des événements passés."
    ]
  },
  {
    version: "1.2",
    changes: [
      "Mémoire permanente repensée : le personnage la consolide lui-même à chaque réponse (fusion des doublons, y compris reformulés, et oubli de ce qui est dépassé).",
      "Fini les souvenirs en double ; la mémoire est toujours en français.",
      "Écran mémoire : les jalons et consignes sont repliables (repliés par défaut) pour plus de lisibilité.",
      "La suppression d'un message ne réécrit plus la mémoire (elle évolue avec l'histoire ; ajuste-la depuis l'écran mémoire si besoin)."
    ]
  },
  {
    version: "1.1.1",
    changes: [
      "Réponses de chat encore plus concises (narration limitée à 2 paragraphes courts).",
      "Correction : régénérer juste après une illustration ne renvoie plus de réponse vide.",
      "Correction : supprimer un persona bascule ses conversations sur le persona par défaut.",
      "L'édition d'un persona liste les conversations qui l'utilisent.",
      "Pendant une génération, toutes les actions du chat sont bloquées (boutons grisés) ; plus d'indicateur « … » à la régénération.",
      "Bouton retour plus fiable et titres tronqués proprement quand ils sont trop longs.",
      "Page Tokens simplifiée : suivi par requêtes, et contour rouge quand un modèle est épuisé.",
      "Noms des personnages sur une seule ligne dans les listes."
    ]
  },
  {
    version: "1.1",
    changes: [
      "Réponses du chat plus courtes (narration bornée), pour des échanges plus vivants.",
      "Les personnages secondaires peuvent désormais parler, dans la conversation comme dans la salutation.",
      "Mémoire permanente : mise à jour plus fiable au fil de la conversation, et plus de fuite du bloc technique à l'écran.",
      "Génération d'image : correction de l'erreur de prompt trop long (photo de profil et illustration de scène).",
      "Création de personnage par IA : plus de bridage des personnages secondaires.",
      "Barre d'état Android accordée au thème.",
      "Ajout de cette page de notes de version, et divers ajustements d'affichage."
    ]
  },
  {
    version: "1.0",
    changes: []
  }
];
