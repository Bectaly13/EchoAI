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
    "- \"greeting\" est un premier message dit par le personnage lui-même, pour planter le décor (à la 1ʳᵉ personne).",
    "- Les autres champs sont concis. Laisse une chaîne vide pour un champ que le brouillon ne permet pas de remplir raisonnablement.",
    "- N'invente pas de personnages connus si le brouillon n'en mentionne pas.",
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
  required: ["name", "systemPrompt"]
};
