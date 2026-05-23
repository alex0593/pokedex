/**
 * sentry.client.config.ts — inicialización de Sentry en el navegador.
 * Este archivo es cargado automáticamente por @sentry/nextjs en el bundle del cliente.
 * Solo se inicializa si NEXT_PUBLIC_SENTRY_DSN está definido en .env.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // 10 % de las sesiones incluyen trazas de performance.
    // Sube hasta 1.0 en staging para depurar; baja a 0.05 en producción con mucho tráfico.
    tracesSampleRate: 0.1,

    // Session Replay desactivado para proteger privacidad del usuario.
    // Activa replaysOnErrorSampleRate si quieres capturas solo en errores.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // No enviar IPs ni headers de usuario (GDPR).
    sendDefaultPii: false,
  });
}
