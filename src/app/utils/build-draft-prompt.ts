// Construit l'instruction envoyée à l'IA pour transformer un brouillon libre
// en fiche de personnage structurée (remplit les champs du formulaire de création).
// Le résultat attendu est un JSON conforme à CHARACTER_DRAFT_SCHEMA.
export function buildDraftPrompt(brief: string): string {
  return [
    "Tu es un assistant qui aide à créer des personnages pour une application de chat de fiction.",
    "À partir du brouillon ci-dessous, rédige une fiche de personnage complète et cohérente, en français.",
    "",
    "Consignes :",
    "- Reste fidèle au brouillon ; comble les manques de façon plausible sans contredire ce qui est donné.",
    "- \"systemPrompt\" décrit la personnalité, la façon de parler, le ton et ce que sait le personnage (rédigé à la 3ᵉ personne, comme des instructions de jeu de rôle).",
    "- \"greeting\" est le message d'ouverture qui plante le décor. Il DOIT suivre le format des messages : les répliques sont préfixées par le nom de celui qui parle puis mises entre guillemets droits (ex. : Alice : \"Bonjour\"), et la narration (actions, lieux, ambiance) est écrite à la 3ᵉ personne, comme un narrateur, entre astérisques et en dehors des guillemets (ex. : *La nuit tombe sur le port.*). Dans la narration, désigne l'utilisateur par « tu ». Passe à la ligne entre la narration et une réplique (et inversement). La salutation peut faire intervenir des personnages secondaires (qui parlent et agissent), pas seulement le personnage principal, pour planter un décor vivant. Reste concis : chaque paragraphe de narration fait 1 à 2 phrases courtes au maximum, et au plus 2 paragraphes de narration (ces limites ne concernent que la narration, pas les dialogues).",
    "- Les autres champs sont concis. Laisse une chaîne vide pour un champ que le brouillon ne permet pas de remplir raisonnablement.",
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
    greeting: { type: "string" },
    appearance: { type: "string" },
    initialRelationship: { type: "string" },
    likes: { type: "string" },
    dislikes: { type: "string" },
    knownCharacters: { type: "string" }
  },
  // Ordre de génération des champs (Gemini ne garantit pas l'ordre sinon).
  propertyOrdering: [
    "name",
    "systemPrompt",
    "greeting",
    "appearance",
    "initialRelationship",
    "likes",
    "dislikes",
    "knownCharacters"
  ],
  required: ["name", "systemPrompt", "greeting"]
};
