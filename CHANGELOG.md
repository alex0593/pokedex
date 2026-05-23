# CHANGELOG

Todos los cambios notables en este proyecto se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
versión siguiendo [SemVer](https://semver.org/lang/es/).

---

## [2.3.0] — 2026-05-23

### Bloque 9 — Favoritos (feature completa)

#### Backend
- **`UserFavorite` model** — tabla `user_favorites` con `UniqueConstraint(user_id, entity_type, entity_name)`
- **`utils/deps.py`** — dependencia `get_current_user` reutilizable (JWT → usuario)
- **`routers/favorites.py`** — 3 endpoints protegidos:
  - `GET /users/favorites/` — lista con filtro opcional por `entity_type`
  - `POST /users/favorites/` — añadir favorito, idempotente
  - `DELETE /users/favorites/{type}/{name}` — eliminar, 204 o 404
- **8 nuevos tests** en `test_favorites.py` (lista vacía, añadir, idempotencia, filtro, eliminar, 404, 401, aislamiento entre usuarios)
- **Fix router factory** — `make_catalog_router` acepta `route_prefix` para plurales irregulares (`/abilities`, `/berries`)
- **Fix `test_catalog.py`** — migrado de `respx` context manager (no interceptaba cliente singleton httpx) a `unittest.mock.patch`

#### Frontend
- **`favoritesService.ts`** — `listFavorites / addFavorite / removeFavorite` con autenticación JWT
- **`FavoritesContext.tsx`** — estado global con actualizaciones optimistas y rollback en caso de error de red
- **`FavoriteButton.tsx`** — botón ❤️/🤍 absoluto sobre la tarjeta, visible en hover y siempre si ya es favorito
- **5 Cards actualizadas** — `PokemonCard`, `ItemCard`, `BerryCard`, `MoveCard`, `AbilityCard` con props opcionales `isFavorite?` + `onToggleFavorite?`
- **5 páginas conectadas** — botón de favorito aparece solo si el usuario está autenticado
- **`/favorites` page** — colección agrupada por tipo con contador, estado vacío y botón de eliminar
- **`FavoritesProvider`** en `layout.tsx` (anidado dentro de `AuthProvider`)
- **4 nuevos tests** en `tests/services/favoritesService.test.ts`

### Bloque 10 — Documentación y pulido

- **README.md** — reescritura completa: Quick Start en 5 min, diagrama Mermaid, tabla de endpoints, variables de entorno, instrucciones de tests, guía de contribución
- **CHANGELOG.md** — historial completo con SemVer
- **LICENSE** — MIT
- **FastAPI** — descripción rica en Markdown, OpenAPI tags con descripciones, versión 2.3.0
- **MiniNav** — enlace ❤️ Favoritos añadido a la barra de navegación
- **`/health`** y `root()` actualizados a v2.3.0

---

## [2.2.1] — 2026-05-22

### Bloque 8 — Observabilidad y seguridad

- **Sentry SDK** — `sentry-sdk[fastapi]` en backend (opt-in via `SENTRY_DSN`); `@sentry/nextjs` en frontend (opt-in via `NEXT_PUBLIC_SENTRY_DSN`)
- **`instrumentation.ts`** — hook de Next.js para init server-side de Sentry
- **Security headers** en `next.config.ts` — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy vía `withSentryConfig`
- **Security headers middleware** en `main.py` — HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- **`scripts/backup.sh`** — `pg_dump` via Docker Compose con rotación de 7 backups
- **ruff a 0** — B904 (raise from e) en todos los routers, E402 (imports fuera de orden) en `user.py`, pyproject.toml correcto (`[tool.ruff.lint]`, target-version py313)
- **ESLint a 0** — `useTriviaGame` circular deps resueltos con refs, `BaseModal` ARIA fix, `AbilityCard` key determinística
- **`conftest.py`** — añadido `testserver` a `ALLOWED_HOSTS` para que `TrustedHostMiddleware` no bloquee los tests

---

## [2.2.0] — 2026-05-10

### Bloques 1–7 — Infraestructura de producción

#### Bloque 1: Hardening crítico
- CORS restringido a `CORS_ORIGINS` env var (fail-fast si falta)
- `SECRET_KEY` obligatorio (fail-fast); eliminado fallback hardcoded
- `datetime.utcnow()` → `datetime.now(timezone.utc)` (Python 3.12+ compat)
- Todas las dependencias con versiones fijadas en `requirements.txt`
- Monorepo unificado (`.git` en raíz); Docker setup con PostgreSQL 15 + Redis 7
- `.env.example` en backend y frontend

#### Bloque 2: Calidad de código
- TypeScript: eliminados 9 `any` con tipado correcto
- ESLint: imports sin usar removidos; `useCallback` + deps correctas en 5 páginas
- `next/image` reemplaza `<img>` en 4 modales
- Python: `print()` → `logging.getLogger(__name__)`; `except BaseException` → excepciones específicas
- Pydantic v2: `Config` → `model_config = ConfigDict(...)`; pyproject.toml con ruff

#### Bloque 3: Refactor
- `routers/_generic.py` — factory `make_catalog_router` (132 líneas → 8 líneas por router)
- `BaseModal.tsx` — modal accesible reutilizable (focus trap, ARIA, ESC)
- `apiClient.ts` — cliente HTTP unificado (retry exponencial, timeout, errores tipados)
- `cache.ts` — cache en memoria centralizado (`pokemonCache`, `catalogCache`)

#### Bloque 4: Estado global y accesibilidad
- `AuthContext.tsx` — estado global auth con sync multi-tab via `StorageEvent`
- `useTriviaGame.ts` — hook extraído del mini-juego (8 useState + 5 useRef → 1 hook)
- `loading.tsx` / `error.tsx` — boundaries de Next.js App Router
- ARIA completo en 5 modales (aria-labelledby, aria-modal, role="dialog", aria-label, focus inicial)

#### Bloque 5: Performance y resiliencia
- `cache_service.py` — Redis singleton con TTL (24h por defecto); degrada graciosamente si falla
- `retry_with_backoff()` — backoff exponencial en `PokeAPIService` (3 reintentos)
- `Cache-Control` en endpoints de catálogo (list: 1h, detail: 24h)
- `next/dynamic` para todos los modales y componentes pesados (code splitting)

#### Bloque 6: Tests
- Backend: `pytest` + `conftest.py` (fixtures async SQLite), `test_auth.py` (5 tests), `test_catalog.py` (3 tests)
- Frontend: `vitest` + `@testing-library/react`; tests para `apiClient`, `AuthContext`, `useTriviaGame`

#### Bloque 7: Infraestructura
- `backend/Dockerfile` — multistage, usuario no-root, uvicorn con 4 workers, health check
- `frontend/Dockerfile` — multistage, non-root, dumb-init, NEXT_TELEMETRY_DISABLED
- `docker-compose.yml` — PostgreSQL 15 + Redis 7 + backend + frontend con health checks y dependencias ordenadas
- `.github/workflows/ci.yml` — jobs paralelos: ruff + pytest + ESLint + tsc + vitest + next build + docker build
- `GET /health` — endpoint de health check para Docker y load balancers

---

## [1.0.0] — 2026-03-06

### MVP inicial

- Pokédex básica consumiendo PokeAPI
- Catálogos: objetos, bayas, habilidades, movimientos
- Mini-juego "¿Quién es ese Pokémon?"
- Auth JWT con perfiles de usuario y logros regionales
- Frontend Next.js 16 con App Router
