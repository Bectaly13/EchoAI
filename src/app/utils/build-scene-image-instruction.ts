// Construit l'instruction (méta-prompt) envoyée à Gemini pour qu'il rédige, à partir du
// contexte d'une scène, un PROMPT text-to-image (FLUX) pertinent, en anglais et épuré (SFW).
// Pipeline IA-IA : Gemini transforme le contexte de chat en description visuelle, qui est
// ensuite envoyée à Cloudflare. Le résultat attendu est un JSON conforme à SCENE_IMAGE_SCHEMA.
//
// Types découplés (mémoire/messages/persona) pour éviter un import circulaire avec ChatService.
export function buildSceneImageInstruction(
  character: { name?: string; appearance?: string },
  persona: { name?: string; gender?: string; appearance?: string } | undefined,
  memory: { category: string; value: string }[],
  recentMessages: { role: string; text: string }[]
): string {
  const lines: string[] = [
    "Tu es un assistant qui rédige un PROMPT pour un modèle de génération d'image (text-to-image, type FLUX).",
    "À partir du contexte d'une scène de fiction ci-dessous, produis le prompt décrivant l'IMAGE à générer.",
    "",
    "Règles de sortie :",
    "- Rédige le prompt en ANGLAIS.",
    "- Décris UNE seule image : qui est présent, ce qu'ils font, le lieu, l'ambiance, le cadrage (plan large, gros plan…).",
    "- Mots-clés et courtes phrases visuelles UNIQUEMENT. AUCUN dialogue, AUCUNE balise (*…*), aucun nom suivi de deux-points, aucun texte à faire apparaître dans l'image.",
    "- Concis : 60 à 80 mots maximum.",
    "",
    "Personnages et apparences :",
    "- Utilise les descriptions physiques fournies. Pour un personnage présent SANS description, invente une apparence plausible et cohérente (évite tout rendu générique).",
    "- N'inclus l'utilisateur QUE s'il apparaît dans la scène actuelle ; dans ce cas, utilise son apparence.",
    "- Tous les personnages sont des ADULTES.",
    "",
    "Moment à illustrer (TRÈS IMPORTANT) :",
    "- Illustre l'INSTANT PRÉSENT, c'est-à-dire l'état décrit par le DERNIER message. Le contexte antérieur sert UNIQUEMENT à comprendre la situation présente.",
    "- Si un paramètre a changé au fil des messages (lieu, personnages présents, action, moment de la journée…), illustre le DERNIER état, jamais un état antérieur (ex. : si on passe d'un lieu A à un lieu B, illustre B). Cela vaut pour le lieu ET pour tous les autres paramètres.",
    "",
    "Épuration (CRITIQUE) :",
    "- Le service de génération d'image est très restrictif. Le prompt doit être ENTIÈREMENT SFW, sobre et non choquant.",
    "- AUCUN terme explicite, sexuel, graphique ou violent ne doit apparaître dans le prompt. Recadre toute situation mature en une scène suggérée et pudique (ex. « two adults embracing » plutôt qu'une description explicite).",
    "",
    "Contexte de la scène :"
  ];

  // Personnage principal (nom + apparence si connue).
  const charName = character.name?.trim();
  const charAppearance = character.appearance?.trim();
  lines.push(
    `- Personnage principal : ${charName || "(sans nom)"}` +
    (charAppearance ? ` — apparence : ${charAppearance}` : " — apparence non précisée (à inventer si présent)")
  );

  // Persona de l'utilisateur (transmis ; Gemini décide de l'inclure s'il est dans la scène).
  if (persona) {
    const personaName = persona.name?.trim();
    const gender = personaGenderPhrase(persona.gender);
    const personaAppearance = persona.appearance?.trim();
    lines.push(
      `- Utilisateur${personaName ? ` : ${personaName}` : ""}${gender ? ` (${gender})` : ""}` +
      (personaAppearance ? ` — apparence : ${personaAppearance}` : " — apparence non précisée (à inventer si présent)")
    );
  }

  // Lieu et situation courants (dernières valeurs de mémoire).
  const location = lastValue(memory, "location");
  if (location) {
    lines.push(`- Lieu (état courant) : ${location}`);
  }
  const situation = lastValue(memory, "situation");
  if (situation) {
    lines.push(`- Situation actuelle : ${situation}`);
  }

  // Derniers messages porteurs de texte (le dernier = l'instant à illustrer).
  const messages = recentMessages
    .filter(message => message.text.trim())
    .slice(-8)
    .map(message => message.text.trim());
  if (messages.length > 0) {
    lines.push("", "Messages récents (du plus ancien au plus récent ; le DERNIER est l'instant à illustrer) :");
    messages.forEach((text, index) => {
      lines.push(`${index === messages.length - 1 ? "→ (présent) " : "- "}${text}`);
    });
  }

  return lines.join("\n");
}

// Schéma de réponse attendu de Gemini : un objet { imagePrompt } (chaîne, en anglais).
export const SCENE_IMAGE_SCHEMA = {
  type: "object",
  properties: {
    imagePrompt: { type: "string" }
  },
  required: ["imagePrompt"]
};

// Formulation française du genre du persona (vide si non précisé).
function personaGenderPhrase(gender: string | undefined): string {
  switch (gender) {
    case "male": return "un homme";
    case "female": return "une femme";
    case "other": return "une personne non binaire";
    default: return "";
  }
}

// Dernière valeur d'une catégorie de mémoire donnée (ou "" si absente).
function lastValue(memory: { category: string; value: string }[], category: string): string {
  const entries = memory.filter(entry => entry.category === category);
  return entries.length ? entries[entries.length - 1].value : "";
}
