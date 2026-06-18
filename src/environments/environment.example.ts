// Modèle de configuration à copier en environment.ts (et environment.prod.ts),
// puis à renseigner avec ta vraie clé. Ce fichier-ci, lui, est versionné.
export const environment = {
  production: false,
  // Récupère ta clé gratuite sur https://aistudio.google.com (bouton "Get API key").
  GEMINI_API_KEY: "COLLE_TA_CLE_ICI",
  // Modèles de texte, du préféré au moins prioritaire : repli automatique sur le
  // suivant si le quota du précédent est épuisé (429).
  GEMINI_MODELS: [
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash"
  ],
  // Génération d'image : false sur le palier gratuit (Imagen = réservé aux plans
  // payants, modèles « Nano Banana » = quota 0). Passer à true avec un plan payant.
  GEMINI_IMAGE_ENABLED: false,
  // Modèles d'image, du plus performant au moins performant : on bascule sur
  // le suivant si le quota du précédent est épuisé (429). Ex. palier gratuit.
  GEMINI_IMAGE_MODELS: [
    "imagen-4.0-ultra-generate-001",
    "imagen-4.0-generate-001",
    "imagen-4.0-fast-generate-001"
  ],
  GEMINI_API_URL: "https://generativelanguage.googleapis.com/v1beta/models"
};
