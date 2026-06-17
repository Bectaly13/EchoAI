// Assemble le prompt système envoyé à Gemini, par blocs nettement séparés.
// Point d'entrée unique : toutes les sources (personnage, persona, mémoire,
// consignes de format…) viennent s'ajouter ici au fil des fonctionnalités,
// sans que ChatService n'ait à changer.

import { Character } from "../services/character-service";

// Sources d'assemblage du prompt. S'enrichira avec persona, mémoire, options…
export interface BuildSystemPromptOptions {
  character: Character;
}

// Construit le prompt système complet à partir des sources fournies.
export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
  const blocks: string[] = [];

  blocks.push(buildCharacterBlock(options.character));

  // Les blocs sont séparés par une ligne vide pour rester lisibles côté modèle.
  return blocks.join("\n\n");
}

// Bloc décrivant le personnage que l'IA doit incarner.
function buildCharacterBlock(character: Character): string {
  const lines = [
    "PERSONNAGE",
    `Tu incarnes « ${character.name} ». Reste fidèle à ce personnage en toutes circonstances.`
  ];
  const personality = character.systemPrompt.trim();
  if (personality) {
    lines.push(personality);
  }
  return lines.join("\n");
}
