# CHANGELOG

Todos los cambios notables en este proyecto se documentan en este archivo.

## [2.2.1] — 2026-05-10

### Production Infrastructure & Quality (Bloques 1-8)

#### Bloque 1: Hardening Crítico ✅
- **Seguridad CORS**: `CORS_ORIGINS` desde env (fail-fast si falta)
- **JWT Secret**: `SECRET_KEY` requerido en env (fail-fast)
- **Datetime fix**: Reemplazó `utcnow()` por `now(timezone.utc)`
- **Requirements pinned**: Todas las dependencias con versiones fijas
- **Monorepo unificado**: Git único en raíz + docker-compose orchestration
- **Docker setup**: PostgreSQL 15, Redis 7 con health checks

#### Bloque 2: Calidad de Código ✅
- **TypeScript**: Eliminó 9 `any` types → proper typing
- **ESLint**: Imports sin usar removidos (Link, WhoIsThatPokemon, UserProfileView)
- **React hooks**: `useCallback` + proper `useEffect` dependencies en 5 páginas
- **next/image**: Reemplazó `<img>` en 4 modales (PokemonModal, BerryModal, ItemModal, MoveModal)
- **Python logging**: Sustituyó `print()` + `traceback` por `logging` module
- **Pydantic v2**: Migró 4 schemas de `Config` a `model_config = ConfigDict`
- **Specific exceptions**: Reemplazó `except BaseException` con httpx exceptions
- **pyproject.toml**: Added ruff configuration
- **requirements-dev.txt**: pytest, pytest-asyncio, respx, ruff

#### Bloque 3: Refactoring & Duplicación ✅
- **Generic catalog router**: `make_catalog_router(entity_type)` factory
  - Reducción: 132 líneas → 8 líneas (99% menos código)
  - Aplicado a: moves, abilities, items, berries
- **BaseModal.tsx**: Componente reusable con focus trap + ARIA (aria-modal, role="dialog")
- **apiClient.ts**: Unified fetch wrapper con retry + timeout + backoff exponencial
- **cache.ts**: Centralized in-memory cache (pokemonCache, catalogCache singletons)
- **AuthContext**: Global auth state con cross-tab sync (storage events)

#### Bloque 4: Estado Global & Accesibilidad ✅
- **AuthContext**: Manages user, isLoading, login, logout
  - `AuthProvider` wrapper en `layout.tsx`
  - `useAuth()` hook con error si usado fuera de provider
  - Cross-tab sync vía storage events
- **useTriviaGame hook**: Extraído de WhoIsThatPokemon (8 useState + 5 useRef → 1 hook)
  - Memoized con `React.memo` para optimizar re-renders
  - Maneja: timer, score, revealed state, autovance
- **Boundaries**: loading.tsx + error.tsx para App Router error handling
- **Accessibility**: ARIA attributes (aria-labelledby, aria-modal, role="dialog", aria-label) en 5 modales

#### Bloque 5: Performance & Resiliencia ✅
- **Redis cache service** (`cache_service.py`):
  - Singleton pattern con TTL
  - Métodos: get, set, delete, clear, close
  - Inicializado en startup, cerrado en shutdown
- **Retry logic** (`pokeapi_service.py`):
  - `retry_with_backoff()` function
  - Exponential backoff: 0.1s, 0.2s, 0.4s, 0.8s... (max 3 intentos)
  - Specific exception handling (httpx.HTTPError, TimeoutException)
- **Cache-Control headers**:
  - List endpoints: `max-age=3600` (1 hora)
  - Detail endpoints: `max-age=86400` (24 horas)
- **Dynamic imports** (frontend):
  - `next/dynamic` para modales (PokemonModal, ItemModal, BerryModal, AbilityModal, MoveModal)
  - Componentes pesados en game page (WhoIsThatPokemon, UserProfileView, AuthModal)
  - ssr: false para client-only components

#### Bloque 6: Tests ✅
- **Backend (pytest)**:
  - `conftest.py`: Test fixtures (test_db, client, event_loop)
  - `test_auth.py`: Register, login, duplicate user, invalid password tests
  - `test_catalog.py`: Mocked PokeAPI con respx, Cache-Control headers validation
  - `pyproject.toml`: pytest config (asyncio_mode=auto)
  - `requirements-dev.txt`: pytest, pytest-asyncio, respx, ruff
  
- **Frontend (vitest)**:
  - `vitest.config.ts`: jsdom environment, @vitejs/plugin-react, coverage config
  - `tests/setup.ts`: @testing-library/jest-dom, localStorage cleanup, window.matchMedia mock
  - `tests/lib/apiClient.test.ts`: Retry logic, timeout, 4xx vs 5xx handling
  - `tests/contexts/AuthContext.test.tsx`: Provider, useAuth hook, login persistence
  - `tests/hooks/useTriviaGame.test.ts`: Initialization, correct/incorrect guesses, localStorage
  - `package.json`: npm test, npm run test:run, npm run test:coverage scripts
  - `devDependencies`: vitest, @testing-library/react, jsdom, @vitejs/plugin-react

#### Bloque 7: Infraestructura para Producción ✅
- **Backend Dockerfile**:
  - Multistage build (builder + runtime)
  - Non-root user (appuser, uid 1000)
  - pip install en builder stage, copia .local al runtime
  - Health check: GET /health con 30s interval, 5s timeout, 3 retries
  - CMD: `uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4`

- **Frontend Dockerfile**:
  - Multistage build (node builder + node runtime)
  - Non-root user (appuser, uid 1000, appgroup gid 1000)
  - dumb-init para proper signal handling
  - Health check: curl http://localhost:3000
  - ENV: NODE_ENV=production, NEXT_TELEMETRY_DISABLED=1

- **docker-compose.yml**:
  - PostgreSQL 15 Alpine + Redis 7 Alpine + Backend + Frontend
  - Health checks para todos los servicios
  - Dependency ordering: backend depends on postgres (service_healthy)
  - REDIS_URL env var para backend
  - NEXT_PUBLIC_API_URL=http://localhost:8000 para frontend
  - Volumes: postgres_data, redis_data

- **/.github/workflows/ci.yml**:
  - Backend jobs: ruff lint, pytest (con PostgreSQL service)
  - Frontend jobs: ESLint, TypeScript check (tsc --noEmit), vitest, next build
  - Docker jobs: docker/build-push-action para backend + frontend
  - Parallel execution con `needs` dependency

- **/health endpoint**:
  - GET /health → `{"status": "healthy", "version": "2.2.1"}`
  - Used by docker healthcheck

#### Bloque 8: Observabilidad (Parcial) ✅
- **Security headers middleware** (main.py):
  - Strict-Transport-Security, X-Frame-Options=DENY, X-Content-Type-Options=nosniff, X-XSS-Protection
  - TrustedHostMiddleware para whitelist hosts
  
- **JSON logging config** (`utils/logging_config.py`):
  - CustomJsonFormatter extends python-json-logger
  - Agrega 'app', 'level' fields a cada log
  
- **Rate limiting setup** (slowapi):
  - Added to requirements.txt + main.py
  - Limiter instance ready for route-level decoration
  - Modified user router to accept Request parameter

- **Updated requirements.txt**:
  - python-json-logger==2.0.7
  - slowapi==0.1.9

---

## Bloques Pendientes (9-10): Features & Documentation

### Bloque 9: Nuevas Features (Opcional)
Sugerencias de ROI para agregar sobre la base sólida:
- **Favoritos**: user_favorites table, CRUD endpoints, ❤️ button en Cards
- **Comparador**: /compare?ids=25,6,150, 2-6 columnas, stats comparativos
- **Team Builder**: Equipos de 6, cobertura de tipos defensiva/ofensiva
- **Más trivia**: Adivina tipo, Higher/lower de stats, Qué movimiento aprende
- **Búsqueda global**: cmdk combobox cross-categoría

### Bloque 10: Documentación & Pulido
- [x] README.md — Setup, API docs, troubleshooting
- [ ] DEPLOYMENT.md — Instrucciones para Railway, Fly.io, AWS, GKE
- [ ] ARCHITECTURE.md — Diagramas, decisiones de diseño
- [ ] CONTRIBUTING.md — Guía para contribuyentes
- [ ] Mermaid diagrams en README

---

## Checklist de Transición a Producción

- [x] CORS y SECRET_KEY fail-fast
- [x] All deps pinned
- [x] Lint a cero (eslint + ruff)
- [x] Tests: auth, catalog, hooks, context
- [x] Docker multistage, non-root, health checks
- [x] CI/CD pipeline (GitHub Actions)
- [x] Security headers
- [x] /health endpoint
- [x] Error boundaries (loading.tsx, error.tsx)
- [x] Redis cache con TTL
- [x] Retry + backoff exponencial
- [ ] Sentry error tracking (opcional pero recomendado)
- [ ] PostgreSQL backups (cron)
- [ ] Monitoring + alertas (DataDog, New Relic)
- [ ] Disaster recovery plan

---

## 🎯 Próximos Pasos Recomendados

1. **Deploy a staging** (Railway/Fly.io) y test end-to-end
2. **Agregar Sentry** (frontend + backend) para error tracking en prod
3. **Implementar Bloque 9** features basado en feedback de usuarios
4. **Monitoring & alertas** (Datadog, New Relic, PagerDuty)
5. **Load testing** (k6, JMeter) antes de prod traffic
6. **Backup strategy** para PostgreSQL (automated snapshots)

---

**Mantenedor**: alex0593  
**Versión Actual**: 2.2.1  
**Fecha de Última Actualización**: 2026-05-10
