// Construit l'instruction envoyée à l'IA pour transformer un brouillon libre
// en fiche de personnage structurée (remplit les champs du formulaire de création).
// Le résultat attendu est un JSON conforme à CHARACTER_DRAFT_SCHEMA.
export function buildDraftPrompt(brief: string): string {
  return [
    "Tu es un assistant qui aide à créer des personnages pour une application de chat de fiction.",
    "À partir du brouillon ci-dessous, rédige une fiche de personnage complète et cohérente, en français.",
    "",
    "Consignes générales :",
    "- Reste fidèle au brouillon ; comble les manques de façon plausible sans contredire ce qui est donné.",
    "- Mets le nom réel du personnage UNIQUEMENT dans le champ \"name\". Partout ailleurs (tous les champs), désigne le personnage principal par la balise {char} au lieu de réécrire son nom, et désigne l'utilisateur par la balise {user} quand un personnage le nomme. L'application remplacera ces balises par les vrais noms. Cela permet de renommer le personnage en un seul endroit.",
    "- Les champs sont concis. Laisse une chaîne vide pour un champ optionnel que le brouillon ne permet pas de remplir raisonnablement — SAUF \"scenario\", à toujours proposer.",
    "",
    "Champ par champ :",
    "- \"systemPrompt\" : la personnalité, le tempérament, les valeurs et ce que sait le personnage (rédigé à la 3ᵉ personne, comme des instructions de jeu de rôle).",
    "- \"speechStyle\" : la façon de parler — registre de langue, tics de langage, accent, ton.",
    "- \"appearance\" : décris D'ABORD le physique (couleur de cheveux et d'yeux, taille, corpulence, traits du visage, âge apparent…). Les vêtements et accessoires ne viennent qu'APRÈS et brièvement ; l'attitude/le caractère ne vont PAS ici (ils relèvent de la personnalité).",
    "- \"background\" : l'histoire et le passé du personnage (origines, événements marquants de sa vie).",
    "- \"setting\" : l'univers / le cadre où se déroule l'histoire (monde, époque, lieu).",
    "- \"scenario\" : l'intrigue / la situation de départ qui plante l'histoire, au-delà du seul message d'accueil. Propose TOUJOURS une situation cohérente avec le brouillon.",
    "- \"preferences\" : ce que le personnage aime ET ce qu'il n'aime pas, réunis dans un seul champ.",
    "- \"knownCharacters\" : une LISTE de personnages secondaires NOMMÉS, un par ligne, chacun avec son nom + sa fonction + sa relation au personnage. Exemple : \"- Lana, meilleure amie\\n- Mme Dubois, professeure de chimie\\n- M. Durand, proviseur\". INTERDIT de te contenter d'ensembles génériques non nommés (ex. « les autres élèves, les professeurs ») : il faut de vrais noms pour fonder un socle stable (sinon un personnage risque de changer de nom au fil de l'histoire).",
    "- \"greeting\" : le message d'ouverture qui plante le décor. Il DOIT suivre le format des messages : les répliques sont préfixées par le nom de celui qui parle puis mises entre guillemets droits — pour le personnage principal, utilise la balise (ex. : {char} : \"Bonjour\") ; la narration (actions, lieux, ambiance) est écrite à la 3ᵉ personne, comme un narrateur, entre astérisques et en dehors des guillemets (ex. : *La nuit tombe sur le port.*). Dans la narration, désigne l'utilisateur par « tu » ; un personnage peut aussi le nommer via {user}. Passe RÉELLEMENT à la ligne (insère un vrai saut de ligne \\n) entre la narration et une réplique, et entre deux répliques — n'enchaîne jamais narration et dialogue sur la même ligne. Exemple exact du format attendu (chaque élément sur sa propre ligne) :\n*La nuit tombe sur le port ; une silhouette s'avance.*\n{char} : \"Te voilà enfin.\"\nLana : \"On t'attendait.\"\nLa salutation peut faire intervenir des personnages secondaires (qui parlent et agissent), pas seulement le personnage principal, pour planter un décor vivant. Reste concis : chaque paragraphe de narration fait 1 à 2 phrases courtes au maximum, et au plus 2 paragraphes de narration (ces limites ne concernent que la narration, pas les dialogues).",
    "",
    "Brouillon :",
    brief.trim()
  ].join("\n");
}

// Schéma de réponse (sous-ensemble OpenAPI compris par Gemini) : un objet dont
// les clés correspondent aux champs de CharacterDraft. Tout est en chaînes.
export const CHARACTER_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    systemPrompt: { type: "string" },
    speechStyle: { type: "string" },
    appearance: { type: "string" },
    background: { type: "string" },
    setting: { type: "string" },
    scenario: { type: "string" },
    initialRelationship: { type: "string" },
    preferences: { type: "string" },
    knownCharacters: { type: "string" },
    greeting: { type: "string" }
  },
  // Ordre de génération des champs (Gemini ne garantit pas l'ordre sinon). On place le
  // contexte (personnalité, cadre, scénario) avant la salutation, qui en découle.
  propertyOrdering: [
    "name",
    "systemPrompt",
    "speechStyle",
    "appearance",
    "background",
    "setting",
    "scenario",
    "initialRelationship",
    "preferences",
    "knownCharacters",
    "greeting"
  ],
  required: ["name", "systemPrompt", "greeting", "scenario"]
};
