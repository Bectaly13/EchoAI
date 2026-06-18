// Construit le prompt text-to-image d'une photo de profil à partir des champs
// déjà saisis dans la fiche du personnage (apparence en priorité, complétée par
// le nom et la personnalité). Pensé pour un avatar : portrait, cadrage serré.
export function buildImagePrompt(fields: { name?: string; appearance?: string; systemPrompt?: string }): string {
  const parts: string[] = ["Photo de profil (portrait, buste, fond neutre) d'un personnage de fiction."];
  const name = fields.name?.trim();
  const appearance = fields.appearance?.trim();
  const personality = fields.systemPrompt?.trim();
  if (name) {
    parts.push(`Nom : ${name}.`);
  }
  // L'apparence est la source la plus utile pour un rendu fidèle.
  if (appearance) {
    parts.push(`Apparence : ${appearance}.`);
  } else if (personality) {
    // À défaut d'apparence décrite, on s'appuie sur la personnalité.
    parts.push(`Personnalité : ${personality}.`);
  }
  return parts.join(" ");
}
