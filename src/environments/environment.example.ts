// Modèle de configuration à copier en environment.ts (et environment.prod.ts),
// puis à renseigner avec ta vraie clé. Ce fichier-ci, lui, est versionné.
export const environment = {
  production: false,
  // Récupère ta clé gratuite sur https://aistudio.google.com (bouton "Get API key").
  GEMINI_API_KEY: "COLLE_TA_CLE_ICI",
  // Modèles de texte, du préféré au moins prioritaire : repli automatique sur le
  // suivant si le quota du précédent est épuisé (429). `rpd` = requêtes/jour du
  // palier gratuit (saisie à la main, l'API ne l'expose pas ; affichée dans le suivi).
  GEMINI_MODELS: [
    { id: "gemini-3.1-flash-lite", rpd: 500 },
    { id: "gemini-2.5-flash-lite", rpd: 20 },
    { id: "gemini-2.5-flash", rpd: 20 }
  ],
  GEMINI_API_URL: "https://generativelanguage.googleapis.com/v1beta/models",
  // Génération d'image via Cloudflare Workers AI (gratuit, ~10 000 neurons/jour).
  // account id + token sur dash.cloudflare.com → AI → Workers AI → "Use REST API".
  // Vides = génération d'image désactivée.
  CLOUDFLARE_ACCOUNT_ID: "COLLE_TON_ACCOUNT_ID_ICI",
  CLOUDFLARE_API_TOKEN: "COLLE_TON_TOKEN_ICI",
  CLOUDFLARE_IMAGE_MODEL: "@cf/black-forest-labs/flux-1-schnell"
};
