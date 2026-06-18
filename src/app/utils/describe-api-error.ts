import { HttpErrorResponse } from '@angular/common/http';

// Extrait un message lisible d'une erreur quelconque (utilisé dans les toasts).
// Pour une erreur HTTP, on remonte le statut et, si présent, le message d'erreur
// renvoyé par l'API Gemini (corps de la forme { error: { code, message, status } }).
export function describeApiError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const apiMessage = error.error?.error?.message;
    if (apiMessage) {
      return `HTTP ${error.status} — ${apiMessage}`;
    }
    return `HTTP ${error.status} ${error.statusText}`.trim();
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Erreur inconnue";
}
