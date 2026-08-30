/**
 * Proxy catch-all — reenvía todas las peticiones /api/** al backend.
 *
 * Por qué existe esto en vez de usar rewrites() en next.config.ts:
 * Next.js 16 Turbopack implementa protección anti-DNS-rebinding en el dev server:
 * bloquea peticiones cuyo Host header no sea localhost. Los rewrites() pasan por
 * ese filtro y son rechazados desde IPs externas (Tailscale, móvil, etc.).
 * Los Route Handlers de App Router están exentos de esa restricción.
 *
 * En producción (next build) sigue siendo un proxy server-side normal.
 */
import { NextRequest, NextResponse } from 'next/server';

const backendHost = process.env.BACKEND_URL || 'http://localhost:8000';
const BACKEND_URL = backendHost.includes('://') ? backendHost : `http://${backendHost}`;

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  const { search } = new URL(req.url);
  const url = `${BACKEND_URL}/${path.join('/')}${search}`;

  // Reenviar solo los headers relevantes para el backend
  const headers = new Headers();
  for (const key of ['content-type', 'authorization']) {
    const val = req.headers.get(key);
    if (val) headers.set(key, val);
  }

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  const res = await fetch(url, init);
  const responseHeaders = new Headers();
  for (const key of ['content-type', 'etag', 'last-modified']) {
    const value = res.headers.get(key);
    if (value) responseHeaders.set(key, value);
  }

  const isPublicResponse = !headers.has('authorization') && res.ok;
  if (isPublicResponse) {
    const cacheControl = res.headers.get('cache-control');
    if (cacheControl) responseHeaders.set('cache-control', cacheControl);
  } else {
    responseHeaders.set('cache-control', 'private, no-store');
  }

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}

export const GET    = proxy;
export const POST   = proxy;
export const PUT    = proxy;
export const PATCH  = proxy;
export const DELETE = proxy;
