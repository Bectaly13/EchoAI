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
// une mise à jour. Repli : si le modèle oublie les balises et laisse les lignes
// « catégorie: valeur » nues en fin de réponse, on les récupère quand même et on les
// retire de l'affichage (sinon elles fuiteraient dans la conversation).

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
  // Cas normal : le modèle a bien encadré ses lignes par [[MEMORY]]…[[/MEMORY]].
  const match = /\[\[MEMORY\]\]([\s\S]*?)\[\[\/MEMORY\]\]/i.exec(raw);
  if (match) {
    const text = raw
      .replace(/\[\[MEMORY\]\][\s\S]*?\[\[\/MEMORY\]\]/gi, "")
      .replace(/\[\[\/?MEMORY\]\]/gi, "")
      .trim();
    return { text: text, updates: parseMemoryLines(match[1]) };
  }

  // Repli : pas de bloc balisé. Le modèle émet parfois les lignes « catégorie: valeur »
  // nues en fin de réponse → sans ce repli elles fuiteraient dans la conversation et
  // ne seraient pas enregistrées. On les récupère et on les retire du texte affiché.
  return salvageTrailingMemory(raw);
}

// Interprète un bloc de lignes « catégorie: valeur » en mises à jour de mémoire.
function parseMemoryLines(block: string): MemoryUpdate[] {
  const updates: MemoryUpdate[] = [];
  for (const rawLine of block.split("\n")) {
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
  return updates;
}

// Indique si une ligne ressemble à une ligne de mémoire « catégorie connue: valeur ».
// Les catégories sont des mots-clés anglais minuscules, absents de la narration FR
// (où les répliques s'écrivent « Nom : "…" »), d'où un risque de faux positif faible.
function isMemoryLine(line: string): boolean {
  const stripped = line.replace(/^[-*]\s*/, "");
  const separator = stripped.indexOf(":");
  if (separator === -1) {
    return false;
  }
  const category = stripped.slice(0, separator).trim().toLowerCase();
  const value = stripped.slice(separator + 1).trim();
  return value.length > 0 && CATEGORIES.includes(category);
}

// Récupère, en fin de message, les lignes de mémoire nues (sans balises) : on remonte
// depuis la dernière ligne tant qu'elles ressemblent à de la mémoire (lignes vides
// intercalées tolérées), puis on les retire du texte affiché.
function salvageTrailingMemory(raw: string): ParsedMemory {
  // Retire d'éventuelles balises orphelines (bloc ouvert mais jamais fermé).
  const cleaned = raw.replace(/\[\[\/?MEMORY\]\]/gi, "");
  const lines = cleaned.split("\n");
  const trailing: string[] = [];
  while (lines.length > 0) {
    const candidate = lines[lines.length - 1].trim();
    if (!candidate) {
      lines.pop();
      continue;
    }
    if (isMemoryLine(candidate)) {
      trailing.unshift(candidate);
      lines.pop();
      continue;
    }
    break;
  }
  const updates = parseMemoryLines(trailing.join("\n"));
  // Rien reconnu → on ne touche pas au texte (hormis les balises orphelines retirées).
  const text = (updates.length > 0 ? lines.join("\n") : cleaned).trim();
  return { text: text, updates: updates };
}
