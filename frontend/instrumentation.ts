/**
 * instrumentation.ts — hook de Next.js para inicialización server-side.
 * Se ejecuta en Node.js y en el Edge runtime antes de servir cualquier request.
 * @sentry/nextjs lo usa para capturar excepciones no manejadas en el servidor.
 * Solo se activa si SENTRY_DSN (servidor) o NEXT_PUBLIC_SENTRY_DSN están definidos.
 */
export async function register() {
  // Render puede suspender el backend aunque el frontend siga disponible.
  // Este request se dispara al iniciar el proceso de Next.js y no bloquea el
  // arranque: su único objetivo es provocar el cold start del servicio API.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const backendUrl = process.env.BACKEND_URL;

    if (backendUrl) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45_000);

      void fetch(new URL("/health", backendUrl), {
        cache: "no-store",
        signal: controller.signal,
      })
        .catch(() => {
          // El warm-up es best-effort. La API puede tardar en despertar y
          // las peticiones normales del frontend harán sus propios reintentos.
        })
        .finally(() => clearTimeout(timeoutId));
    }
  }

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
