# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

POKEDEX is a fullstack Pokémon catalog + trivia app **on the path to production**. Monorepo with two parts:

- **`backend/`** — FastAPI 0.135 (async) wrapping PokeAPI, with auth/profiles/achievements stored in PostgreSQL. Caches via Redis.
- **`frontend/`** — Next.js 16 (App Router) + React 19 + TypeScript (strict), consumes the backend.

The user communicates in Spanish — respond in Spanish unless asked otherwise.

## Architecture

### Backend (`backend/`)

The backend is a **proxy + transformation layer over PokeAPI**, plus a small auth/stats database:

- **`main.py`** — FastAPI app entry. Reads `CORS_ORIGINS` (fail-fast `RuntimeError`). Adds `slowapi` rate limiting, `TrustedHostMiddleware`, custom security headers middleware. `@app.on_event("startup")` initialises `CacheService`, then runs `Base.metadata.create_all`. `@app.on_event("shutdown")` closes `PokeAPIService` and `CacheService`.
- **`database.py`** — Async SQLAlchemy engine. Reads `DATABASE_URL` (fail-fast). `prepared_statement_cache_size=0` kept for legacy PgBouncer compatibility.
- **`services/pokeapi_service.py`** — Singleton `PokeAPIService` with shared `httpx.AsyncClient` (`max_keepalive=20, max_connections=100`) and `asyncio.Semaphore(50)`. Top-level `retry_with_backoff(coro, max_retries=3, base_delay=0.1)` helper wraps fetch calls with exponential backoff. All routers go through this service. `transform_generic()` handles moves/abilities/items/berries; `_transform_pokemon_data()` handles Pokémon.
- **`services/cache_service.py`** — Singleton `CacheService` over `aioredis`. Gracefully degrades if Redis is unavailable (logs a warning, continues without cache). TTL defaults to 24 h. Pattern: `await CacheService.initialize(redis_url)` once at startup; `CacheService.get_instance()` everywhere else.
- **`routers/_generic.py`** — `make_catalog_router(entity_type, entity_display_name)` factory. Generates the 3-endpoint pattern (list, batch, detail) for `moves`, `abilities`, `items`, `berries`. Each endpoint sets `Cache-Control` headers (3600 s for lists/batch, 86400 s for detail).
- **`routers/`** — Catalog routers (`moves.py`, `abilities.py`, `items.py`, `berries.py`) each call `make_catalog_router(...)`. Special-cased: `pokemon.py`, `evolutions.py`, `locations.py`, `stats.py`, `types.py`. `user.py` handles JWT auth + profiles/achievements.
- **`utils/auth_utils.py`** — JWT (HS256) via `python-jose` + bcrypt. `SECRET_KEY` required (fail-fast); tokens last 1 week.
- **`utils/logging_config.py`** — `setup_json_logging(app_name)` configures a root JSON handler using `python-json-logger`. All modules use `logging.getLogger(__name__)`; no `print()` calls.
- **`models/`** — Pydantic v2 schemas (`model_config = ConfigDict(...)`) + SQLAlchemy ORM models.

### Frontend (`frontend/src/`)

- **`lib/apiClient.ts`** — Unified HTTP client. Reads `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`). Supports method, headers, body, per-call timeout (default 10 s), and retry count (default 3) with exponential backoff. Throws `ApiError` on HTTP errors; does not retry 4xx.
- **`lib/cache.ts`** — Generic in-memory `Cache<K,V>` class (wraps `Map`). Singleton exports: `pokemonCache`, `catalogCache`.
- **`services/`** — `pokemonService.ts` and `catalogService.ts` both use `apiClient` + their respective cache singletons. `authService.ts` handles JWT storage in `localStorage` (`poke_token` / `poke_user` keys).
- **`contexts/AuthContext.tsx`** — `AuthProvider` + `useAuth()` hook. Reads initial state from `localStorage`, propagates logout/login across tabs via `StorageEvent`.
- **`app/`** — Next.js App Router pages: `pokemon`, `items`, `berries`, `abilities`, `moves`, `game/` (Who's That Pokémon). Root `layout.tsx` wraps everything in `<AuthProvider>`. `loading.tsx` and `error.tsx` provide route-level suspense/error boundaries.
- **`components/`** — `BaseModal` (accessibility: ESC key, overlay click, focus trap on open, `aria-modal`, `aria-labelledby`). Entity-specific modals (`PokemonModal`, `BerryModal`, `ItemModal`, `AbilityModal`, `MoveModal`) extend it. Card components one-to-one with modals.
- **`utils/translations.ts`** — Local Spanish dict for stat/type/damage-class names.

## Common Commands

### Docker (recommended — full stack)

```bash
# From repo root
docker compose up -d            # builds + starts postgres/redis/backend/frontend
docker compose ps               # check HEALTHY status
docker compose logs -f backend  # tail backend logs
docker compose down -v          # stop + delete volumes (wipes DB)
```

The backend container hot-reloads via volume mount (`./backend:/app`) + `uvicorn --reload`. The frontend container runs the production build; use `npm run dev` locally for hot reload.

### Backend (outside Docker)

```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
venv\Scripts\uvicorn main:app --reload
```

On Windows outside Docker, `DATABASE_URL` must use `host.docker.internal:5432` instead of `localhost`.

### Backend — tests & lint

```bash
cd backend
pytest                          # all tests (asyncio_mode=auto, -v --tb=short)
pytest tests/test_auth.py -v    # single file
pytest -k "test_login" -v       # single test by name
ruff check .                    # linter (pyproject.toml config, target py314)
ruff check . --fix              # auto-fix safe issues
```

### Frontend

```bash
cd frontend
npm install
npm run dev           # http://localhost:3000
npm run build
npm run lint          # ESLint
npx tsc --noEmit      # TypeScript strict check
npm test              # vitest watch mode
npm run test:run      # vitest single run
npm run test:coverage # coverage report
```

### Database / cache access

```bash
docker compose exec postgres psql -U pokedex_user -d pokedex
docker compose exec redis redis-cli -a pokedex_redis_pass_dev
```

## Required Environment Variables

The backend **fails to start** without:

- `DATABASE_URL` — `postgresql+asyncpg://pokedex_user:pokedex_password_dev@postgres:5432/pokedex` (Docker) or `host.docker.internal` (Windows host)
- `SECRET_KEY` — generate with `python -c "import secrets; print(secrets.token_urlsafe(64))"`
- `CORS_ORIGINS` — comma-separated, e.g. `http://localhost:3000`
- `REDIS_URL` — `redis://:pokedex_redis_pass_dev@redis:6379/0` (Redis is live; cache degrades gracefully if unreachable)

Frontend:
- `NEXT_PUBLIC_API_URL` — defaults to `http://localhost:8000` if unset

`.env.example` files exist in `backend/` and `frontend/`. Real `.env` files are gitignored.

## CI / CD

`.github/workflows/ci.yml` runs on push/PR to `main` and `develop`:

1. **backend** job — ruff lint + pytest (with a real Postgres service container)
2. **frontend** job — ESLint + `tsc --noEmit` + vitest + `next build`
3. **docker** job (after both pass) — builds both Docker images to verify Dockerfiles

## Improvement Plan (10 blocks)

Active work follows a 10-block plan stored at `C:\Users\ALEXIS\.claude\plans\analiza-el-proyecto-y-mellow-cook.md`. Read it before starting non-trivial work.

| Block | Status | Topic |
|-------|--------|-------|
| 1 | ✅ Done | Hardening (CORS, SECRET_KEY, pinned deps, monorepo unification, Docker setup) |
| 2 | ✅ Done | Lint to zero, JSON logging (`logging_config.py`), Python logging replaces `print` |
| 3 | ✅ Done | Generic catalog router factory (`_generic.py`), `BaseModal<T>`, unified `apiClient` |
| 4 | ✅ Done | `AuthContext`, focus trap on `BaseModal`, `loading.tsx` / `error.tsx` boundaries |
| 5 | ✅ Done | `CacheService` (Redis, TTL), `retry_with_backoff` in `PokeAPIService` |
| 6 | ✅ Done | Tests: pytest + conftest (backend), vitest + jsdom (frontend) |
| 7 | ✅ Done | Frontend `Dockerfile`, GitHub Actions CI (lint + test + docker build) |
| 8 | ✅ Done | `slowapi` rate limiting, JSON logging, Sentry SDK (backend+frontend), security headers (CSP, HSTS…), `scripts/backup.sh` |
| 9 | Pending | Features: favorites, comparator, team builder, more trivia modes |
| 10 | Pending | Polish: root README, CHANGELOG, LICENSE, Swagger tags |

Each block must leave the repo green (lint + runnable) before moving on. Commit per block: `Bloque N: <summary>`.

## Known Issues / Gotchas

- **Python 3.14** in use locally (`cpython-314.pyc` artifacts). Verify new dependencies support 3.14 before adding. `pyproject.toml` uses `target-version = "py313"` for ruff (py314 not supported in ruff 0.8.4).
- **`aioredis`** (used in `cache_service.py`) is the legacy standalone package, not the `redis` package's async interface. Keep this in mind if upgrading.
- **`@app.on_event("startup/shutdown")`** is deprecated in FastAPI ≥ 0.93 — should migrate to `lifespan` context manager in a future block.
- **No GitHub remote yet** — the monorepo at root has no remote. Create `alex0593/pokedex` and `git remote add origin ...` when ready to push.
- **`TrustedHostMiddleware`** in `main.py` — update `ALLOWED_HOSTS` env var for actual domain before production.
- **Backup snapshot** at `D:\Proyectos_Desarrollo\POKEDEX_backup_bloque1\` — do not touch.
- **`@sentry/nextjs`** installed with `--legacy-peer-deps` (peer dep declares Next.js ≤15; runtime is compatible with 16).
- **Sentry is opt-in** — no DSN = Sentry disabled, app starts normally. Backend: `SENTRY_DSN`. Frontend: `NEXT_PUBLIC_SENTRY_DSN`.
- **Security headers** aplicados en `next.config.ts` (CSP, HSTS, X-Frame-Options…) y también en `backend/main.py` middleware.
- **Backup script** en `scripts/backup.sh` — requiere Docker Compose activo; rota últimos 7 dumps.

## Memory Files

Persistent context lives at `C:\Users\ALEXIS\.claude\projects\D--Proyectos-Desarrollo-POKEDEX\memory\`:
- `MEMORY.md` — index
- `user_language.md` — Spanish
- `project_pokedex.md` — high-level project state

Update these when project facts change. Read before assuming user preferences or project state.
