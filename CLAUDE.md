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

- **`main.py`** — FastAPI app entry. Reads `CORS_ORIGINS` from env (fail-fast `RuntimeError` if missing). Registers all routers. Old `@app.on_event("startup")` runs `Base.metadata.create_all` to autoprovision tables.
- **`database.py`** — Async SQLAlchemy engine. Reads `DATABASE_URL` (fail-fast). Configured with `prepared_statement_cache_size=0` (legacy from Supabase PgBouncer compatibility — keep until removed).
- **`services/pokeapi_service.py`** — Singleton `PokeAPIService` class with shared `httpx.AsyncClient` (`max_keepalive=20, max_connections=100`) and `asyncio.Semaphore(50)` to throttle concurrent PokeAPI calls. All routers go through this service, never call PokeAPI directly. **Caching is intentionally absent** — the strategy is to delegate caching to the frontend (per the original v2.2.1 README) but Bloque 5 will introduce Redis caching here.
- **`routers/`** — Catalog routers (`moves.py`, `abilities.py`, `items.py`, `berries.py`) follow an **identical 3-endpoint pattern** (list, batch, detail) that's marked for refactoring into a generic factory in Bloque 3. `pokemon.py`, `evolutions.py`, `locations.py`, `stats.py`, `types.py` are special-cased. `user.py` handles JWT auth + profiles/achievements.
- **`utils/auth_utils.py`** — JWT (HS256) with `python-jose` + bcrypt password hashing. `SECRET_KEY` is required (fail-fast); tokens last 1 week.
- **`models/`** — Pydantic schemas + SQLAlchemy ORM models. Currently mixes Pydantic v1 `Config` style (legacy) with v2 — Bloque 2 migrates to `model_config = ConfigDict(...)`.

### Frontend (`frontend/src/`)

- **`app/`** — Next.js App Router. One client-side page per catalog: `pokemon`, `items`, `berries`, `abilities`, `moves`, plus `game/` (Who's That Pokémon trivia).
- **`components/`** — Card + Modal pairs per entity (PokemonCard/PokemonModal, BerryCard/BerryModal, etc.) with **heavy duplication** marked for `BaseModal<T>` / `BaseCard<T>` extraction in Bloque 3.
- **`services/`** — `pokemonService.ts`, `catalogService.ts`, `authService.ts` each contain their own `Map`-based cache and hardcoded `'http://localhost:8000'` base URL. Bloque 3 unifies into a single `apiClient` reading `NEXT_PUBLIC_API_URL`.
- **`utils/translations.ts`** — Local Spanish dict for stat/type/damage-class names (the API returns English).

## Common Commands

### Docker-first dev (recommended — required since `localhost`→Docker on Windows is unreliable)

```bash
# From repo root
docker compose up -d            # builds backend image + starts postgres/redis/backend
docker compose ps               # check HEALTHY status
docker compose logs -f backend  # tail backend logs
docker compose down -v          # stop + delete volumes (wipes DB)
```

The backend container hot-reloads via volume mount (`./backend:/app`) + `uvicorn --reload`.

### Backend (only if running outside Docker)

```bash
cd backend
venv\Scripts\activate            # Windows; venv exists in tree
pip install -r requirements.txt
venv\Scripts\uvicorn main:app --reload
```

When running outside Docker on Windows, `.env` must use `host.docker.internal:5432` (not `localhost`) for `DATABASE_URL`. Inside Docker it's `postgres:5432`. This is a known Docker Desktop / Windows gotcha.

### Frontend

```bash
cd frontend
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint    # currently 14 errors + 15 warnings (Bloque 2 target)
```

### Database access

```bash
docker compose exec postgres psql -U pokedex_user -d pokedex
docker compose exec redis redis-cli -a pokedex_redis_pass_dev
```

## Required Environment Variables

The backend **fails to start** if these are missing:

- `DATABASE_URL` — `postgresql+asyncpg://pokedex_user:pokedex_password_dev@postgres:5432/pokedex` (Docker) or `host.docker.internal` (Windows host)
- `SECRET_KEY` — generate with `python -c "import secrets; print(secrets.token_urlsafe(64))"`
- `CORS_ORIGINS` — comma-separated, e.g. `http://localhost:3000`
- `REDIS_URL` — `redis://:pokedex_redis_pass_dev@redis:6379/0` (used from Bloque 5 onwards)

`.env.example` files exist in both `backend/` and `frontend/`. Real `.env` files are gitignored.

## Improvement Plan (10 blocks)

Active work follows a 10-block plan stored at `C:\Users\ALEXIS\.claude\plans\analiza-el-proyecto-y-mellow-cook.md`. Read it before starting non-trivial work — it has rationale, file paths, and verification steps for each block.

| Block | Status | Topic |
|-------|--------|-------|
| 1 | ✅ Done | Hardening (CORS, SECRET_KEY, pinned deps, monorepo unification, Docker setup, bye Supabase) |
| 2 | ⏳ Next | Lint to zero (9 `any`s, missing useEffect deps, raw `<img>` → `next/image`, Python `logging` instead of `print`) |
| 3 | Pending | Refactor: generic catalog router factory, `BaseModal<T>`, unified `apiClient` |
| 4 | Pending | AuthContext, focus trap on modals, loading/error boundaries |
| 5 | Pending | Redis caching with TTL, retry+backoff in `PokeAPIService`, dynamic imports |
| 6 | Pending | Tests: pytest + respx (backend), vitest + msw (frontend) |
| 7 | Pending | Production infra (Dockerfile multistage prod, GitHub Actions CI) |
| 8 | Pending | Observability (structlog JSON, Sentry, slowapi rate limiting) |
| 9 | Pending | Features (favorites, comparator, team builder, more trivia modes) |
| 10 | Pending | Polish (root README, CHANGELOG, LICENSE, Swagger tags) |

Each block must leave the repo green (lint + arrancable) before moving on. Commit per block with message `Bloque N: <summary>`.

## Known Issues to Be Aware Of

- **`backend/services/pokeapi_service.py`** has duplicate `import os` (lines 6-7), several `except BaseException`/`except Exception` (lines 95, 216, 230), and `print(...)` calls instead of logging. Block 2 cleans these.
- **Python 3.14** is in use locally — note `cpython-314.pyc` artifacts. Confirm new dependencies support 3.14 before adding.
- **Two old GitHub remotes** (`alex0593/backend`, `alex0593/frontend-pokedex`) were pre-monorepo. The new monorepo at root has no remote yet — the user needs to create `alex0593/pokedex` or similar and `git remote add origin ...` when ready.
- **Backup snapshot** at `D:\Proyectos_Desarrollo\POKEDEX_backup_bloque1\` from before the git unification. Don't touch it.
- **`backend/lint_output.txt`** (file inside frontend) is binary UTF-16 — decode before reading.

## Memory Files

Persistent context lives at `C:\Users\ALEXIS\.claude\projects\D--Proyectos-Desarrollo-POKEDEX\memory\`:
- `MEMORY.md` — index
- `user_language.md` — Spanish
- `project_pokedex.md` — high-level project state

Update these when project facts change (new constraints, new decisions). Read them before assuming things about user preferences or project state.
