// Extrait l'état complet de la mémoire permanente émis par l'IA en fin de réponse,
// via la convention balisée suivante (le modèle réémet TOUTE la mémoire à jour à
// chaque tour ; elle remplace la précédente) :
//
//   [[MEMORY]]
//   location: <lieu actuel>
//   relationship: <état de la relation>
//   milestone: <fait marquant>   (autant de lignes que nécessaire)
//   instruction: <consigne durable>
//   [[/MEMORY]]
//
// Le bloc est retiré du texte affiché ; chaque ligne « catégorie: valeur » devient
// une entrée. Repli : si le modèle oublie les balises et laisse les lignes nues en
// fin de réponse, on les récupère quand même et on les retire de l'affichage (sinon
// elles fuiteraient dans la conversation).

// Catégories de mémoire reconnues.
export type MemoryCategory = "location" | "relationship" | "milestone" | "instruction";

const CATEGORIES: string[] = ["location", "relationship", "milestone", "instruction"];

// Une ligne de mémoire détectée (catégorie + valeur).
export interface MemoryLine {
  category: MemoryCategory;
  value: string;
}

// Résultat du parsing : le texte sans le bloc mémoire, un indicateur de présence du
// bloc, et l'état complet de la mémoire (les lignes détectées).
export interface ParsedMemory {
  text: string;
  // Vrai si un bloc mémoire (balisé ou récupéré) était présent → l'appelant remplace
  // toute la mémoire par `entries`. Faux → mémoire laissée inchangée.
  hasMemoryBlock: boolean;
  entries: MemoryLine[];
}

export function parseMemory(raw: string): ParsedMemory {
  // Cas normal : le modèle a bien encadré ses lignes par [[MEMORY]]…[[/MEMORY]].
  const match = /\[\[MEMORY\]\]([\s\S]*?)\[\[\/MEMORY\]\]/i.exec(raw);
  if (match) {
    const text = raw
      .replace(/\[\[MEMORY\]\][\s\S]*?\[\[\/MEMORY\]\]/gi, "")
      .replace(/\[\[\/?MEMORY\]\]/gi, "")
      .trim();
    return { text: text, hasMemoryBlock: true, entries: parseMemoryLines(match[1]) };
  }

  // Repli : pas de bloc balisé. Le modèle émet parfois les lignes « catégorie: valeur »
  // nues en fin de réponse → sans ce repli elles fuiteraient dans la conversation et
  // ne seraient pas enregistrées. On les récupère et on les retire du texte affiché.
  return salvageTrailingMemory(raw);
}

// Interprète un bloc de lignes « catégorie: valeur » en lignes de mémoire.
function parseMemoryLines(block: string): MemoryLine[] {
  const entries: MemoryLine[] = [];
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
      entries.push({ category: category as MemoryCategory, value: value });
    }
  }
  return entries;
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
  const entries = parseMemoryLines(trailing.join("\n"));
  // Rien reconnu → on ne touche pas au texte (hormis les balises orphelines retirées).
  const text = (entries.length > 0 ? lines.join("\n") : cleaned).trim();
  return { text: text, hasMemoryBlock: entries.length > 0, entries: entries };
}
