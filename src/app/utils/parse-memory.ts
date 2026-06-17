// Extrait les mises à jour de mémoire permanente émises par l'IA, via la convention
// balisée suivante, ajoutée TOUT À LA FIN de sa réponse (et seulement si un élément
// durable change) :
//
//   [[MEMORY]]
//   location: <lieu actuel>
//   relationship: <état de la relation>
//   milestone: <fait marquant>
//   instruction: <consigne durable>
//   [[/MEMORY]]
//
// Le bloc est retiré du texte affiché ; chaque ligne « catégorie: valeur » devient
// une mise à jour. Une réponse mal formée dégrade proprement (aucune mise à jour).

// Catégories de mémoire reconnues.
export type MemoryCategory = "location" | "relationship" | "milestone" | "instruction";

const CATEGORIES: string[] = ["location", "relationship", "milestone", "instruction"];

// Une mise à jour détectée (avant d'être enrichie en entrée de mémoire).
export interface MemoryUpdate {
  category: MemoryCategory;
  value: string;
}

// Résultat du parsing : le texte sans le bloc mémoire, et les mises à jour détectées.
export interface ParsedMemory {
  text: string;
  updates: MemoryUpdate[];
}

export function parseMemory(raw: string): ParsedMemory {
  // Texte affiché : on retire tout bloc mémoire (et d'éventuelles balises orphelines).
  const text = raw
    .replace(/\[\[MEMORY\]\][\s\S]*?\[\[\/MEMORY\]\]/gi, "")
    .replace(/\[\[\/?MEMORY\]\]/gi, "")
    .trim();

  const match = /\[\[MEMORY\]\]([\s\S]*?)\[\[\/MEMORY\]\]/i.exec(raw);
  if (!match) {
    return { text: text, updates: [] };
  }

  const updates: MemoryUpdate[] = [];
  for (const rawLine of match[1].split("\n")) {
    // Tolère une puce de liste éventuelle en début de ligne.
    const line = rawLine.trim().replace(/^[-*]\s*/, "");
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const category = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (value && CATEGORIES.includes(category)) {
      updates.push({ category: category as MemoryCategory, value: value });
    }
  }

  return { text: text, updates: updates };
}
