import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// URL del backend — usada SOLO en el servidor Next.js para las rewrites de proxy.
// NO se expone al navegador. En Docker usa el nombre de servicio interno.
// En desarrollo local usa localhost:8000.
const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

// Content Security Policy — diferente según el entorno.
//
// DESARROLLO: permisiva para WebSockets de HMR y conexiones locales.
//   - ws: / wss:           → HMR de Next.js/Turbopack desde cualquier IP (Tailscale, LAN)
//   - http://localhost:*   → fallback por si alguna herramienta de dev conecta directo
//
// PRODUCCIÓN: estricta, solo HTTPS/WSS (las llamadas API van a /api/ = mismo origen).
//
// style-src / font-src: globals.css importa Outfit + Fira Code vía fonts.googleapis.com.
const isDev = process.env.NODE_ENV !== "production";

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://raw.githubusercontent.com",
  "font-src 'self' https://fonts.gstatic.com",
  isDev
    ? "connect-src 'self' http://localhost:* https: ws: wss:"
    : "connect-src 'self' https: wss:",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactCompiler: true,

  // ── Orígenes permitidos en desarrollo (cross-origin HMR / fast refresh) ───────
  // Necesario cuando se accede desde otro dispositivo (móvil, tablet) vía Tailscale
  // (100.x.x.x) o red local (192.168.x.x / 10.x.x.x).
  // Solo aplica en `next dev` — no tiene efecto en producción.
  allowedDevOrigins: [
    "100.*.*.*",     // Tailscale CGNAT range
    "192.168.*.*",   // LAN doméstica / oficina
    "10.*.*.*",      // LAN corporativa
  ],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/**",
      },
    ],
  },

  // ── Proxy al backend ──────────────────────────────────────────────────────────
  // Todas las llamadas a /api/:path* se redirigen al backend en el SERVIDOR de
  // Next.js. El navegador solo ve la misma origin (no hay CORS ni localhost issues).
  // Funciona desde cualquier dispositivo: móvil, tablet, PC.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },

  // Security headers aplicados a todas las rutas
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Legacy XSS filter (browsers modernos lo ignoran, pero no hace daño)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Referrer
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // HSTS — solo tiene efecto en HTTPS; en desarrollo se ignora
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // CSP
          {
            key: "Content-Security-Policy",
            value: cspDirectives,
          },
        ],
      },
    ];
  },
};

// withSentryConfig añade el plugin de webpack para source maps y tracing automático.
// Si SENTRY_AUTH_TOKEN no está definido, no sube source maps (build igualmente OK).
export default withSentryConfig(nextConfig, {
  // Silencia los logs de Sentry durante el build salvo en CI
  silent: !process.env.CI,
  // Organización y proyecto en Sentry (necesarios solo para source maps)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Token para subir source maps — si no está definido, se omite la subida
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
