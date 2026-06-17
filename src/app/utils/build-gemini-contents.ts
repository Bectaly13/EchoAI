// Construit le tableau "contents" attendu par l'API Gemini à partir de l'historique.
// Chaque message devient un tour { role, parts: [{ text }] }.
// On ne garde que les MAX_MESSAGES derniers échanges pour limiter la taille du contexte.

// Nombre maximum de messages renvoyés à l'IA (les plus récents).
const MAX_MESSAGES = 20;

export function buildGeminiContents(messages: { role: string; text: string }[]) {
  return messages
    .slice(-MAX_MESSAGES)
    .map(message => ({
      role: message.role,
      parts: [{ text: message.text }]
    }));
}
