// Modèle de configuration à copier en environment.ts (et environment.prod.ts),
// puis à renseigner avec ta vraie clé. Ce fichier-ci, lui, est versionné.
export const environment = {
  production: false,
  // Récupère ta clé gratuite sur https://aistudio.google.com (bouton "Get API key").
  GEMINI_API_KEY: "COLLE_TA_CLE_ICI",
  GEMINI_MODEL: "gemini-3.1-flash-lite",
  GEMINI_API_URL: "https://generativelanguage.googleapis.com/v1beta/models"
};
