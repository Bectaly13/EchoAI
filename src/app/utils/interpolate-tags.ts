// Remplace les balises dynamiques {char} et {user} par les noms réels du personnage
// et de l'utilisateur (persona actif). Insensible à la casse, espaces internes tolérés
// ({ char }). Utilisé pour le prompt système et la salutation, afin que l'IA ne voie
// jamais les balises — seulement des noms.
export function interpolateTags(text: string, char: string, user: string): string {
  return text
    .replace(/\{\s*char\s*\}/gi, char)
    .replace(/\{\s*user\s*\}/gi, user);
}
