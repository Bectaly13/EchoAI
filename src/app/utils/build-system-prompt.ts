// Assemble le prompt système envoyé à Gemini, par blocs nettement séparés.
// Point d'entrée unique : toutes les sources (personnage, persona, mémoire,
// consignes de format…) viennent s'ajouter ici au fil des fonctionnalités,
// sans que ChatService n'ait à changer.

import { Character } from "../services/character-service";
import { Persona } from "../services/persona-service";

// Sources d'assemblage du prompt. S'enrichira avec la mémoire, des options…
export interface BuildSystemPromptOptions {
  character: Character;
  // Persona incarné par l'utilisateur dans la conversation (facultatif).
  persona?: Persona;
}

// Construit le prompt système complet à partir des sources fournies.
export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
  const blocks: string[] = [];

  blocks.push(buildCharacterBlock(options.character));
  if (options.persona) {
    blocks.push(buildPersonaBlock(options.persona));
  }
  blocks.push(buildFormatBlock());

  // Les blocs sont séparés par une ligne vide pour rester lisibles côté modèle.
  return blocks.join("\n\n");
}

// Bloc décrivant le persona incarné par l'utilisateur (qui il est).
function buildPersonaBlock(persona: Persona): string {
  const lines = [
    "UTILISATEUR (PERSONA)",
    `L'utilisateur incarne « ${persona.name} ». Tiens-en compte dans tes réponses et adresse-toi à lui en conséquence.`
  ];
  const description = persona.description.trim();
  if (description) {
    lines.push(description);
  }
  return lines.join("\n");
}

// Bloc de consignes de mise en forme attendues dans les réponses.
function buildFormatBlock(): string {
  return [
    "CONSIGNES DE FORMAT",
    "Préfixe chaque réplique par le nom de celui qui parle, suivi d'un deux-points, puis mets les paroles entre guillemets droits. Exemple :\nAlice : \"Bonjour\"\nBob : \"Salut\"",
    "Encadre les actions, gestes et passages de narration entre astérisques (par exemple : *il sourit et s'approche*), en dehors des guillemets."
  ].join("\n");
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
