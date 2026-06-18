// Modèle de configuration à copier en environment.ts (et environment.prod.ts),
// puis à renseigner avec ta vraie clé. Ce fichier-ci, lui, est versionné.
export const environment = {
  production: false,
  // Récupère ta clé gratuite sur https://aistudio.google.com (bouton "Get API key").
  GEMINI_API_KEY: "COLLE_TA_CLE_ICI",
  GEMINI_MODEL: "gemini-3.1-flash-lite",
  // Modèles d'image, du plus performant au moins performant : on bascule sur
  // le suivant si le quota du précédent est épuisé (429). Ex. palier gratuit.
  GEMINI_IMAGE_MODELS: [
    "imagen-4.0-ultra-generate-001",
    "imagen-4.0-generate-001",
    "imagen-4.0-fast-generate-001"
  ],
  GEMINI_API_URL: "https://generativelanguage.googleapis.com/v1beta/models"
};
