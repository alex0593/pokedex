# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

POKEDEX is a fullstack Pokémon catalog + trivia app at **v2.3.0 — production-ready**. Monorepo with two parts:

- **`backend/`** — FastAPI 0.135 (async) wrapping PokeAPI, with auth/profiles/achievements/favorites stored in PostgreSQL. Caches via Redis.
- **`frontend/`** — Next.js 16 (App Router) + React 19 + TypeScript (strict), consumes the backend.

The user communicates in Spanish — respond in Spanish unless asked otherwise.

## Architecture

### Backend (`backend/`)

The backend is a **proxy + transformation layer over PokeAPI**, plus a small auth/stats/favorites database:

- **`main.py`** — FastAPI app entry. Reads `CORS_ORIGINS` (fail-fast `RuntimeError`). Adds `slowapi` rate limiting, `TrustedHostMiddleware`, custom security headers middleware. `@app.on_event("startup")` initialises `CacheService`, then runs `Base.metadata.create_all`. `@app.on_event("shutdown")` closes `PokeAPIService` and `CacheService`. OpenAPI tags configured for clean `/docs`. Static files in `backend/assets/` are mounted at `/static`.
- **`database.py`** — Async SQLAlchemy engine. Reads `DATABASE_URL` (fail-fast). `prepared_statement_cache_size=0` kept for legacy PgBouncer compatibility.
- **`services/pokeapi_service.py`** — Singleton `PokeAPIService` with shared `httpx.AsyncClient` (`max_keepalive=20, max_connections=100`) and `asyncio.Semaphore(50)`. Top-level `retry_with_backoff(coro, max_retries=3, base_delay=0.1)` helper wraps fetch calls with exponential backoff. All routers go through this service. `transform_generic()` handles moves/abilities/items/berries; `_transform_pokemon_data()` handles Pokémon.
- **`services/cache_service.py`** — Singleton `CacheService` over `aioredis`. Gracefully degrades if Redis is unavailable (logs a warning, continues without cache). TTL defaults to 24 h. Pattern: `await CacheService.initialize(redis_url)` once at startup; `CacheService.get_instance()` everywhere else.
- **`routers/_generic.py`** — `make_catalog_router(entity_type, entity_display_name, route_prefix=None)` factory. Generates the 3-endpoint pattern (list, batch, detail) for `moves`, `abilities`, `items`, `berries`. `route_prefix` is required for irregular plurals: `abilities.py` passes `route_prefix="/abilities"`, `berries.py` passes `route_prefix="/berries"`. Each endpoint sets `Cache-Control` headers (3600 s for lists/batch, 86400 s for detail).
- **`routers/favorites.py`** — JWT-protected CRUD: `GET /users/favorites/` (optional `entity_type` filter), `POST /users/favorites/` (idempotent), `DELETE /users/favorites/{entity_type}/{entity_name}` (204 or 404).
- **`routers/stats.py`** — Trivia stats endpoints: saves game results (`POST /game/save-result`), returns per-user stats and the global leaderboard. Updates `UserStats` and `Achievement` records. Uses `prefix="/game"` — FastAPI merges it correctly with `game.py` routes; no conflict.
- **`routers/game.py`** — Sistema de Aventura por Regiones (JWT requerido). `REGION_STAGES` define 6 tipos-stage por cada una de las 9 regiones (54 stages totales). `POST /game/stage/answer` registra una respuesta individual, evalúa al llegar a 10 respuestas (≥7/10 para aprobar), y otorga la medalla regional si todos los stages de la región se completan. `GET /game/regions/progress` devuelve el progreso completo del usuario por región. También usa `prefix="/game"`.
- **`routers/pokemon.py`** — `GET /pokemon/game/quiz` acepta `?region=kanto&type=fire` como parámetros `Query` opcionales; los pasa a `PokeAPIService.get_optimized_quiz(region_name, type_name)`. Sin estos params el quiz es aleatorio (modo libre).
- **`routers/`** — Catalog routers (`moves.py`, `abilities.py`, `items.py`, `berries.py`) each call `make_catalog_router(...)`. Special-cased: `pokemon.py`, `evolutions.py`, `locations.py`, `stats.py`, `types.py`. `user.py` handles JWT auth + profiles/achievements/avatars.
- **`utils/auth_utils.py`** — JWT (HS256) via `python-jose` + bcrypt. `SECRET_KEY` required (fail-fast); tokens last 1 week.
- **`utils/deps.py`** — Reusable FastAPI dependency `get_current_user(token, db)`. Decodes JWT, fetches the `User` from DB, raises `HTTP 401` on any failure. Used by `favorites.py` and any future protected router.
- **`utils/logging_config.py`** — `setup_json_logging(app_name)` configures a root JSON handler using `python-json-logger`. All modules use `logging.getLogger(__name__)`; no `print()` calls.
- **`models/user_db.py`** — ORM models: `User`, `UserStats`, `Achievement`, `UserRegionStat`, `UserFavorite`, `UserStageProgress`. `UserStageProgress` tracks (user, region, type) progress with `correct_count`, `total_count`, `attempts`, `completed`. `UniqueConstraint("user_id", "region_name", "type_name")` prevents duplicates.
- **`models/user_schemas.py`** — Pydantic v2 schemas (`model_config = ConfigDict(...)`). Includes `FavoriteCreate`, `FavoriteItem`, `EntityType = Literal["pokemon", "item", "berry", "ability", "move"]`.
- **`data/`** — Static JSON data files: `translations.json` (Spanish translations for game/UI strings) and `region_metadata.json` (region metadata for achievements). Not served via API; imported directly by routers.

### Frontend (`frontend/src/`)

- **`lib/apiClient.ts`** — Unified HTTP client. `BASE_URL = '/api'` (hardcoded; relativo al origen). Next.js proxia `/api/:path*` al backend internamente — funciona desde cualquier dispositivo sin problemas de CORS ni localhost. Soporta method, headers, body, timeout (10 s), retries (3) con backoff exponencial. Lanza `ApiError` en errores HTTP; no reintenta 4xx.
- **`lib/cache.ts`** — Generic in-memory `Cache<K,V>` class (wraps `Map`). Singleton exports: `pokemonCache`, `catalogCache`.
- **`services/`** — `pokemonService.ts` and `catalogService.ts` use `apiClient` + their respective cache singletons. `authService.ts` uses **raw `fetch`** (not `apiClient`) because login requires `application/x-www-form-urlencoded`; it also stores JWT in `localStorage` (`poke_token` / `poke_user` keys). `favoritesService.ts` wraps `listFavorites`, `addFavorite`, `removeFavorite` — all require a JWT token argument.
- **`contexts/AuthContext.tsx`** — `AuthProvider` + `useAuth()` hook. Reads initial state from `localStorage`, propagates logout/login across tabs via `StorageEvent`.
- **`contexts/FavoritesContext.tsx`** — `FavoritesProvider` + `useFavorites()` hook. Maintains a `Set<string>` of keys like `"pokemon:pikachu"`. `toggle(type, name, entityId?)` applies **optimistic updates** immediately and reverts on network error. Loaded on user login, cleared on logout. Must be nested *inside* `AuthProvider` (already done in `layout.tsx`).
- **`components/FavoriteButton.tsx`** — Absolute-positioned ❤️/🤍 button, shown on card hover (always visible if already favorited). Only rendered when `onToggleFavorite` prop is provided (i.e., user is logged in). All 5 card components accept optional `isFavorite?` + `onToggleFavorite?` props.
- **`hooks/useInfiniteScroll.ts`** — `IntersectionObserver`-based hook used by all 5 catalog pages to trigger "load more" on scroll. Accepts `triggerRef`, `loading`, `loadingMore`, and `onLoadMore`.
- **`hooks/useTriviaGame.ts`** — Contiene dos hooks: `useTriviaGame()` (modo libre infinito, pre-fetch del siguiente quiz, highScore en localStorage) y `useStageGame(region, typeName)` (modo aventura: 10 preguntas fijas, llama a `saveStageAnswer`, devuelve `finished/attemptPassed/regionCompleted/newAchievements` cuando se completan las 10 preguntas). Ambos usan `handleGuessRef`/`handleNextRef` para romper cadenas circulares de `useCallback`.
- **`hooks/useToast.ts`** — Lightweight toast notification hook; pairs with `components/Toast.tsx`.
- **`app/`** — Next.js App Router pages: `pokemon`, `items`, `berries`, `abilities`, `moves`, `game/` (hub con tres modos: Libre / Aventura por Regiones / Logros), `favorites/` (grouped collection). Root `layout.tsx` wraps everything in `<AuthProvider><FavoritesProvider>`. `loading.tsx` and `error.tsx` provide route-level suspense/error boundaries.
- **`app/game/page.tsx`** — Hub de juego. Estado interno `GameView = 'hub' | 'free' | 'regions' | 'stage-select' | 'stage-game' | 'profile'`. Carga `fetchRegionsProgress` al montar y pasa el estado a `RegionMap` y `StageSelect`. Las tres tarjetas del hub usan clases CSS distintas: `.modeCard` (Libre, borde azul-gris), `.modeCard + .modeCardAccent` (Aventura, borde rojo), `.modeCard + .modeCardLogros` (Logros, borde dorado).
- **`components/`** — `BaseModal` (accessibility: ESC key, overlay click, focus trap on open, `role="dialog"`, `aria-labelledby`). Entity-specific modals extend it. Card components are one-to-one with modals. `PageLayout.tsx` y `MiniNav.tsx` son wrappers de layout compartido (MiniNav sticky con `position: sticky`). `Skeleton.tsx` provides loading placeholders. Componentes del modo aventura: `RegionMap.tsx` (grid 3×3 de regiones), `StageSelect.tsx` (6 stages por tipo para una región), `StageGame.tsx` (quiz de stage con barra de progreso X/10 y pantalla de resultado).
- **`components/MiniNav.tsx`** — Navegación sin emojis; etiquetas de texto puro (`Inicio`, `Pokémon`…). Separadores `·` entre links via `<span className={styles.sep}>`. Estado activo = subrayado rojo con `::after`, no pill relleno. Usar `React.Fragment` con `key` en el `map` para intercalar los separadores.
- **CSS Design System** — Todas las páginas de catálogo y el hub de juego usan el patrón: contenedor de controles/tarjeta con `background: linear-gradient(160deg, #16172e 0%, #1b1c38 100%)` + `border: 1px solid rgba(255,255,255,0.08)` + `border-top: 3px solid <color de acento>` + `border-radius: 20px`. Títulos de sección: `color: #f0f0f2` (blanco plata sólido, sin gradientes). Botones: `border-radius: 50px` pill. El `.controls` de búsqueda/filtros en las páginas de catálogo y las tarjetas del hub siguen exactamente este patrón. `berries/berries.module.css` es compartido por Bayas, Habilidades **y** Movimientos (abilities y moves importan `from '../berries/berries.module.css'`).
- **`utils/translations.ts`** — Local Spanish dict for stat/type/damage-class names.
- **`utils/typeColors.ts`** — Maps Pokémon type names to Tailwind/CSS color classes.
- **`types/`** — `pokemon.ts` (`PokemonSummary`, `PokemonDetail`, `TypeInfo`) and `catalog.ts` (shared catalog entity types).

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
ruff check .                    # linter (pyproject.toml config, target py313)
ruff check . --fix              # auto-fix safe issues
```

Tests use SQLite in-memory (`sqlite+aiosqlite:///:memory:`) — no Postgres required locally. Test files: `test_auth.py`, `test_catalog.py`, `test_favorites.py`.

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

Note: frontend has vitest configured but **no test files exist yet** (`src/**/*.test.{ts,tsx}` returns empty).

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
- `ALLOWED_HOSTS` — comma-separated hostnames; must include `testserver` when running pytest with `TestClient`

Frontend:
- `BACKEND_URL` — URL interna del backend, usada SOLO por el servidor Next.js para el proxy. `http://localhost:8000` por defecto; en Docker: `http://backend:8000`. No lleva `NEXT_PUBLIC_` (no se expone al navegador).

`.env.example` files exist in `backend/` and `frontend/`. Real `.env` files are gitignored.

## CI / CD

`.github/workflows/ci.yml` runs on push/PR to `main` and `develop`:

1. **backend** job — ruff lint + pytest (with a real Postgres service container)
2. **frontend** job — ESLint + `tsc --noEmit` + vitest + `next build`
3. **docker** job (after both pass) — builds both Docker images to verify Dockerfiles

## Known Issues / Gotchas

- **Python 3.14** in use locally. Verify new dependencies support 3.14 before adding. `pyproject.toml` uses `target-version = "py313"` for ruff (py314 not supported in ruff 0.8.4).
- **`redis.asyncio`** (used in `cache_service.py`) — migrado de `aioredis` porque `aioredis` 2.x importa `distutils.version.StrictVersion` que fue eliminado en Python 3.12+. Usar siempre `redis.asyncio.from_url(url)` (sin `await`, es síncrono) y `aclose()` para cerrar (no `close()`).
- **`@app.on_event("startup/shutdown")`** is deprecated in FastAPI ≥ 0.93 — should migrate to `lifespan` context manager.
- **`create_all` race condition con múltiples workers** — con `--workers >1`, todos los procesos ejecutan `startup()` en paralelo y chocan al crear las tablas SERIAL (la secuencia `users_id_seq` se intenta crear dos veces → `UniqueViolationError` en `pg_class_relname_nsp_index`). Solucionado con `try/except` alrededor de `create_all` en `main.py` + `--workers 1` en el Dockerfile (suficiente para este proyecto).
- **No GitHub remote yet** — the monorepo at root has no remote. Create `alex0593/pokedex` and `git remote add origin ...` when ready to push.
- **`TrustedHostMiddleware`** — update `ALLOWED_HOSTS` env var for actual domain before production. In tests, `conftest.py` sets `os.environ['ALLOWED_HOSTS'] = 'localhost,127.0.0.1,testserver'` (TestClient uses `testserver` as host).
- **`@sentry/nextjs`** installed with `--legacy-peer-deps` (peer dep declares Next.js ≤15; runtime is compatible with 16).
- **Sentry is opt-in** — no DSN = Sentry disabled, app starts normally. Backend: `SENTRY_DSN`. Frontend: `NEXT_PUBLIC_SENTRY_DSN`.
- **`respx` + singleton httpx client** — `with respx.mock:` context manager does NOT intercept `PokeAPIService._client` (created before the context). Use `unittest.mock.patch("services.pokeapi_service.PokeAPIService.get_generic_data", new_callable=AsyncMock)` instead.
- **Irregular router prefixes** — `abilities.py` uses `route_prefix="/abilities"` and `berries.py` uses `route_prefix="/berries"` in `make_catalog_router(...)`. Without it the factory appends `s` literally (`/abilitys`, `/berrys`).
- **`authService.ts` uses raw `fetch`** — Unlike `pokemonService.ts`/`catalogService.ts`, the auth service bypasses `apiClient.ts` because login requires `application/x-www-form-urlencoded`. Keep them separate; don't refactor to `apiClient`.
- **`app/loading.tsx` NO debe incluir `<html>`/`<body>`** — App Router renderiza `loading.tsx` *dentro* del `layout.tsx` existente. Tener `<html lang="es"><body>` en el loading causaba un error de hidratación (`<html> cannot be a child of <body>`).
- **CSP en `next.config.ts`**: `connect-src 'self' https: ws://localhost:* wss:`. Las llamadas al backend van a `/api/...` (mismo origen → `'self'`). `style-src` incluye `https://fonts.googleapis.com` y `font-src` incluye `https://fonts.gstatic.com` porque `globals.css` importa Outfit + Fira Code vía `@import url()`.
- **Proxy API via Next.js rewrites**: `next.config.ts` incluye `rewrites()` que mapea `/api/:path*` → `${BACKEND_URL}/:path*` (server-side). `BACKEND_URL` se lee como variable de entorno del SERVIDOR (no `NEXT_PUBLIC_`). En Docker: `http://backend:8000`. Localmente: `http://localhost:8000`. El backend debe aceptar el Host `backend` → `ALLOWED_HOSTS` incluye `backend` en docker-compose.
- **`uvicorn --reload` no detecta archivos nuevos** — al crear un router nuevo (ej. `routers/game.py`), el proceso uvicorn en ejecución no lo carga automáticamente aunque `main.py` lo importe. Síntoma: las rutas del nuevo router devuelven 404 y no aparecen en `/openapi.json`. Solución: `docker compose restart backend` o matar y relanzar uvicorn. Verificar con `GET /openapi.json` que las rutas nuevas estén listadas antes de depurar el frontend.
- **`routers/stats.py` y `routers/game.py` comparten `prefix="/game"`** — FastAPI los fusiona correctamente (`/game/save-result` desde stats, `/game/stage/answer` y `/game/regions/progress` desde game). Si se añaden rutas nuevas al prefijo `/game`, revisar ambos archivos para evitar colisiones de path.
- **Backup script** en `scripts/backup.sh` — requiere Docker Compose activo; rota últimos 7 dumps.
- **Backup snapshot** at `D:\Proyectos_Desarrollo\POKEDEX_backup_bloque1\` — do not touch.
