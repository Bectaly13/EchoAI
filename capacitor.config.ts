import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.echoai.app',
  appName: 'EchoAI',
  webDir: 'www',
  plugins: {
    // Fait passer les requêtes HTTP par la couche native → pas de CORS sur appareil
    // (nécessaire pour l'API Cloudflare Workers AI, qui n'envoie pas d'en-têtes CORS).
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
