// Construit le tableau "contents" attendu par l'API Gemini à partir de l'historique.
// Chaque message devient un tour { role, parts: [{ text }] }.
// On ne garde que les MAX_MESSAGES derniers échanges pour limiter la taille du contexte.

// Nombre maximum de messages renvoyés à l'IA (les plus récents).
const MAX_MESSAGES = 20;

export function buildGeminiContents(messages: { role: string; text: string; kind?: string; imageData?: string }[]) {
  return messages
    // Les messages-images (illustrations) ne sont pas renvoyés au modèle texte.
    .filter(message => !message.imageData)
    .slice(-MAX_MESSAGES)
    // Un aparté OOC est transmis comme tour `user`, encapsulé en ORDRE ABSOLU (sans précision
    // de timing : le modèle l'intègre naturellement au scénario). Sinon, mapping direct.
    .map(message => message.kind === "ooc"
      ? { role: "user", parts: [{ text: `[Instruction hors-personnage de l'utilisateur — ORDRE ABSOLU à respecter, sans jamais la mentionner dans le récit : ${message.text}]` }] }
      : { role: message.role, parts: [{ text: message.text }] });
}
