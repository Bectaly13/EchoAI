// Découpe un message en segments pour l'affichage, en isolant les passages de
// narration encadrés par des astérisques (*…*). Les astérisques sont retirées du
// rendu (remplacées côté CSS par une mise en forme italique/grisée). Une astérisque
// non appariée est laissée telle quelle, dans du texte normal.

// Un segment de message : soit du texte normal (paroles), soit de la narration.
export interface TextSegment {
  text: string;
  isNarration: boolean;
}

// Renvoie les segments successifs du texte (texte normal et narration alternés).
export function formatNarration(text: string): TextSegment[] {
  // Le groupe capturant conserve les délimiteurs *…* dans le résultat du split.
  const parts = text.split(/(\*[^*]+\*)/);
  const segments: TextSegment[] = [];

  for (const part of parts) {
    if (part === "") {
      continue;
    }
    const narration = /^\*([^*]+)\*$/.exec(part);
    if (narration) {
      // Passage de narration, sans les astérisques.
      segments.push({ text: narration[1], isNarration: true });
    } else {
      segments.push({ text: part, isNarration: false });
    }
  }

  return segments;
}
