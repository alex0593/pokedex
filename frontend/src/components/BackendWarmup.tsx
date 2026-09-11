'use client';

import { useEffect } from 'react';

/**
 * Despierta el backend de Render cuando el frontend se abre en el navegador.
 * La llamada pasa por el proxy same-origin de Next.js y no expone BACKEND_URL.
 */
export function BackendWarmup() {
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 45_000);

    void fetch(new URL('/health', backendUrl), {
      cache: 'no-store',
      signal: controller.signal,
    })
      .catch(() => {
        // Es una optimización de arranque; no debe mostrar errores al usuario.
      })
      .finally(() => window.clearTimeout(timeoutId));

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  return null;
}
