import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Content Security Policy — permite los orígenes necesarios sin abrir demasiado.
// 'unsafe-eval' e 'unsafe-inline' son requeridos por Next.js (chunks dinámicos y estilos).
// connect-src incluye 'https:' para cubrir el backend y el ingest de Sentry.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://raw.githubusercontent.com",
  "font-src 'self'",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/**",
      },
    ],
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
