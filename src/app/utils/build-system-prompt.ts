// Assemble le prompt système envoyé à Gemini, par blocs nettement séparés.
// Point d'entrée unique : toutes les sources (personnage, persona, mémoire,
// consignes de format…) viennent s'ajouter ici au fil des fonctionnalités,
// sans que ChatService n'ait à changer.

import { Character } from "../services/character-service";
import { Persona } from "../services/persona-service";

// Une entrée de mémoire telle qu'attendue par le prompt (catégorie + valeur).
// Volontairement minimal pour ne pas coupler ce module au modèle de ChatService.
interface MemoryItem {
  category: string;
  value: string;
}

// Sources d'assemblage du prompt. S'enrichira avec d'autres options au besoin.
export interface BuildSystemPromptOptions {
  character: Character;
  // Persona incarné par l'utilisateur dans la conversation (facultatif).
  persona?: Persona;
  // Mémoire permanente de la conversation (facultative).
  memory?: MemoryItem[];
}

// Construit le prompt système complet à partir des sources fournies.
export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
  const blocks: string[] = [];

  blocks.push(buildCharacterBlock(options.character));
  if (options.persona) {
    blocks.push(buildPersonaBlock(options.persona));
  }
  if (options.memory && options.memory.length > 0) {
    blocks.push(buildMemoryBlock(options.memory));
  }
  blocks.push(buildFormatBlock());
  blocks.push(buildMemoryInstructionBlock());

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
    "Encadre les actions, gestes et passages de narration entre astérisques, en dehors des guillemets. La narration est écrite à la 3ᵉ personne, comme un narrateur omniscient (jamais à la 1ʳᵉ personne) : elle décrit les actions, les lieux et les événements, et peut continuer à décrire la scène même lorsque ton personnage est absent ou que l'utilisateur se retrouve seul. Exemple : *La pièce est silencieuse ; au loin, une porte grince.*"
  ].join("\n");
}

// Bloc rappelant à l'IA les informations durables établies au fil de l'histoire.
function buildMemoryBlock(memory: MemoryItem[]): string {
  const lines = [
    "MÉMOIRE PERMANENTE",
    "Tiens compte de ces informations établies au fil de l'histoire :"
  ];
  const location = latestValue(memory, "location");
  if (location) {
    lines.push(`Lieu actuel : ${location}`);
  }
  const relationship = latestValue(memory, "relationship");
  if (relationship) {
    lines.push(`Relation avec l'utilisateur : ${relationship}`);
  }
  const milestones = valuesOf(memory, "milestone");
  if (milestones.length > 0) {
    lines.push("Jalons de l'histoire :");
    milestones.forEach(value => lines.push(`- ${value}`));
  }
  const instructions = valuesOf(memory, "instruction");
  if (instructions.length > 0) {
    lines.push("Consignes à respecter :");
    instructions.forEach(value => lines.push(`- ${value}`));
  }
  return lines.join("\n");
}

// Dernière valeur connue d'une catégorie à valeur unique (lieu, relation).
function latestValue(memory: MemoryItem[], category: string): string | undefined {
  const matching = memory.filter(item => item.category === category);
  return matching.length > 0 ? matching[matching.length - 1].value : undefined;
}

// Toutes les valeurs d'une catégorie à valeurs multiples (jalons, consignes).
function valuesOf(memory: MemoryItem[], category: string): string[] {
  return memory.filter(item => item.category === category).map(item => item.value);
}

// Bloc expliquant à l'IA comment écrire en mémoire permanente (convention balisée).
function buildMemoryInstructionBlock(): string {
  return [
    "CONSIGNES DE MÉMOIRE",
    "Si — et seulement si — un élément durable change (nouveau lieu, évolution de votre relation, étape importante de l'histoire franchie, consigne à retenir), ajoute TOUT À LA FIN de ta réponse un bloc exactement à ce format :",
    "[[MEMORY]]\nlocation: <le lieu actuel de la scène>\nrelationship: <l'état actuel de ta relation avec l'utilisateur>\nmilestone: <le fait marquant qui vient de se produire>\ninstruction: <une consigne à respecter durablement>\n[[/MEMORY]]",
    "N'inclus que les lignes pertinentes (pas forcément les quatre). N'évoque jamais ce bloc dans ta narration. S'il n'y a rien de nouveau à mémoriser, n'ajoute aucun bloc."
  ].join("\n");
}

// Bloc décrivant le personnage que l'IA doit incarner.
function buildCharacterBlock(character: Character): string {
  const lines = [
    "PERSONNAGE",
    `Tu incarnes « ${character.name} ». Reste fidèle à ce personnage en toutes circonstances.`
  ];
  // Personnalité (description principale), puis les champs structurés renseignés.
  appendField(lines, "", character.systemPrompt);
  appendField(lines, "Apparence", character.appearance);
  appendField(lines, "Relation initiale avec l'utilisateur", character.initialRelationship);
  appendField(lines, "Goûts et préférences", character.likes);
  appendField(lines, "Ce qu'il n'aime pas", character.dislikes);
  appendField(lines, "Personnages qu'il connaît", character.knownCharacters);
  return lines.join("\n");
}

// Ajoute une ligne « Libellé : valeur » (ou juste la valeur si pas de libellé)
// uniquement si la valeur est renseignée.
function appendField(lines: string[], label: string, value: string | undefined): void {
  const text = value?.trim();
  if (!text) {
    return;
  }
  lines.push(label ? `${label} : ${text}` : text);
}
