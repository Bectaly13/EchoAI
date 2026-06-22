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
