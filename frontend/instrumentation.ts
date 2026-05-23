/**
 * instrumentation.ts — hook de Next.js para inicialización server-side.
 * Se ejecuta en Node.js y en el Edge runtime antes de servir cualquier request.
 * @sentry/nextjs lo usa para capturar excepciones no manejadas en el servidor.
 * Solo se activa si SENTRY_DSN (servidor) o NEXT_PUBLIC_SENTRY_DSN están definidos.
 */
export async function register() {
  const dsn =
    process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) return;

  // Node.js runtime (SSR, API routes)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { init } = await import("@sentry/nextjs");
    init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: parseFloat(
        process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"
      ),
      sendDefaultPii: false,
    });
  }

  // Edge runtime (middleware, edge API routes)
  if (process.env.NEXT_RUNTIME === "edge") {
    const { init } = await import("@sentry/nextjs");
    init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: parseFloat(
        process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"
      ),
      sendDefaultPii: false,
    });
  }
}
