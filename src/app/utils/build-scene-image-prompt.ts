// Construit le prompt text-to-image illustrant l'état courant d'une conversation.
// Faute de modèle image-to-image accessible (palier gratuit), on ne peut pas
// fournir la photo de profil comme référence : on décrit donc l'apparence du
// personnage dans le texte pour s'approcher au mieux de son allure.
//
// Types découplés (mémoire/messages) pour éviter un import circulaire avec ChatService.
export function buildSceneImagePrompt(
  character: { name?: string; appearance?: string },
  memory: { category: string; value: string }[],
  recentMessages: { role: string; text: string }[]
): string {
  const parts: string[] = ["Illustration d'une scène de fiction, vue d'ensemble."];

  const name = character.name?.trim();
  const appearance = character.appearance?.trim();
  if (appearance) {
    parts.push(`Personnage${name ? ` (${name})` : ""} : ${appearance}.`);
  } else if (name) {
    parts.push(`Personnage : ${name}.`);
  }

  // Lieu courant : on prend la dernière entrée mémoire de catégorie "location".
  const location = lastValue(memory, "location");
  if (location) {
    parts.push(`Lieu : ${location}.`);
  }

  // Action en cours : on résume les derniers messages porteurs de texte.
  const action = recentMessages
    .filter(message => message.text.trim())
    .slice(-4)
    .map(message => message.text.trim())
    .join(" ");
  if (action) {
    parts.push(`Scène en cours : ${action}`);
  }

  return parts.join(" ");
}

// Dernière valeur d'une catégorie de mémoire donnée (ou "" si absente).
function lastValue(memory: { category: string; value: string }[], category: string): string {
  const entries = memory.filter(entry => entry.category === category);
  return entries.length ? entries[entries.length - 1].value : "";
}
