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
    "Tu n'es pas limité à ton seul personnage : tu peux aussi faire parler et agir les autres personnages présents dans la scène (personnages secondaires, figurants…), chacun préfixé par son nom. Ton personnage principal reste le point de vue, mais la scène peut être vivante et habitée.",
    "Encadre les actions, gestes et passages de narration entre astérisques, en dehors des guillemets. La narration est écrite à la 3ᵉ personne, comme un narrateur omniscient (jamais à la 1ʳᵉ personne) : elle décrit les actions, les lieux et les événements, et peut continuer à décrire la scène même lorsque ton personnage est absent ou que l'utilisateur se retrouve seul. Exemple : *La pièce est silencieuse ; au loin, une porte grince.*",
    "Dans la narration, désigne l'utilisateur par « tu » (jamais « l'utilisateur » ni une 3ᵉ personne pour lui).",
    "Passe à la ligne quand tu passes de la narration à une réplique, ou d'une réplique à la narration, pour aérer la lecture.",
    "Reste concis : chaque paragraphe de narration fait 1 à 2 phrases courtes AU MAXIMUM, et n'écris JAMAIS plus de 2 paragraphes de narration par réponse. Ce sont des maximums, pas des objectifs à atteindre : privilégie des réponses courtes qui laissent rapidement la main à l'utilisateur. Ces restrictions ne concernent que les paragraphes de narration, pas les répliques et dialogues."
  ].join("\n");
}

// Bloc rappelant à l'IA les informations durables établies au fil de l'histoire.
function buildMemoryBlock(memory: MemoryItem[]): string {
  const lines = [
    "MÉMOIRE PERMANENTE",
    "Voici l'état actuel de la mémoire permanente, que tu dois respecter puis maintenir à jour (cf. CONSIGNES DE MÉMOIRE) :"
  ];
  const location = latestValue(memory, "location");
  if (location) {
    lines.push(`Lieu actuel : ${location}`);
  }
  const situation = latestValue(memory, "situation");
  if (situation) {
    lines.push(`Situation actuelle : ${situation}`);
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
    "Tu maintiens une mémoire permanente de l'histoire. À la fin de CHAQUE réponse, si la mémoire contient quelque chose ou qu'il y a quelque chose à retenir, réémets-la EN ENTIER (son état complet et à jour APRÈS ce tour) dans un bloc EXACTEMENT à ce format, balises comprises :",
    "[[MEMORY]]\nlocation: <le lieu actuel de la scène>\nsituation: <où en est l'histoire en ce moment>\nrelationship: <l'état actuel de ta relation avec l'utilisateur>\nmilestone: <un fait marquant vécu>\ninstruction: <une consigne durable à respecter>\n[[/MEMORY]]",
    "Règles générales : réémets TOUTE la mémoire à conserver (ce bloc REMPLACE entièrement la précédente) ; n'écris JAMAIS ces lignes hors des balises [[MEMORY]] / [[/MEMORY]] ; n'évoque jamais ce bloc dans ta narration ; écris TOUTES les valeurs en français.",
    "ÉTAT COURANT — location, situation, relationship : une seule ligne chacun, la valeur actuelle. Mets-la à jour quand elle évolue (l'ancienne valeur est remplacée). « situation » résume où en est l'histoire maintenant (différent d'un événement).",
    "JOURNAL — milestone : la liste CUMULATIVE des faits marquants vécus (une ligne par fait). Un jalon est un événement passé : il n'est JAMAIS obsolète, ne le supprime donc jamais. Conserve tous les jalons existants et AJOUTE les nouveaux.",
    "N'enregistre comme jalon que les faits VRAIMENT MARQUANTS (décision importante, rencontre, révélation, bascule de la relation, objectif ou lieu atteint…) — surtout PAS un jalon par message ni pour des détails anodins.",
    "Fusionne uniquement les vrais doublons (même fait formulé différemment). Si — et seulement si — il y a plus de 30 jalons, regroupe les PLUS ANCIENS en jalons de synthèse fidèles (sans perdre d'information), jamais par simple suppression.",
    "instruction : consignes durables à respecter ; ne les retire que si elles sont explicitement révoquées ou contredites. Conserve les éléments ajoutés par l'utilisateur tant qu'ils restent pertinents."
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
