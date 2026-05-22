# POKEDEX PRO MAX — El Hub Pokémon Definitivo

Aplicación fullstack completa para explorar la Pokédex oficial, objetos, bayas, habilidades, movimientos y participar en mini-juegos interactivos de trivia.

**Versión:** 2.2.1 | **Estado:** Production-ready (Bloques 1-8 completados)

## 🚀 Quick Start (5 minutos)

### Opción 1: Docker (Recomendado)

```bash
git clone https://github.com/alex0593/pokedex.git
cd pokedex
docker compose up -d

# Esperar a que los servicios sean HEALTHY
docker compose ps

# Acceder a:
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Opción 2: Desarrollo Local

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate en Windows
pip install -r requirements.txt
cp .env.example .env
# Editar .env con tus valores
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env
# NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

**Servicios (solo si no usas Docker):**
```bash
# PostgreSQL + Redis deben estar corriendo
docker compose up postgres redis -d
```

## 📐 Arquitectura

```
pokedex/
├── backend/                    # FastAPI 0.135 + SQLAlchemy async
│   ├── routers/               # 10 routers: pokemon, items, abilities, moves, berries, etc.
│   │   └── _generic.py        # Factory para reducir duplicación (3 endpoints × 4 catálogos)
│   ├── services/
│   │   ├── pokeapi_service.py # PokeAPI wrapper + retry con backoff exponencial
│   │   └── cache_service.py   # Redis cache con TTL
│   ├── models/                # SQLAlchemy ORM + Pydantic v2 schemas
│   ├── utils/                 # auth, logging_config
│   ├── tests/                 # pytest + respx (mock PokeAPI)
│   ├── Dockerfile             # Multistage, non-root user
│   └── main.py                # FastAPI app + /health endpoint
│
├── frontend/                   # Next.js 16 + React 19 + TypeScript strict
│   ├── src/
│   │   ├── app/               # 6 páginas + loading.tsx, error.tsx boundaries
│   │   ├── components/        # Cards, Modales con ARIA, MiniNav
│   │   ├── hooks/             # useTriviaGame (extraído, memoizado)
│   │   ├── contexts/          # AuthContext (estado global, sync multi-tab)
│   │   ├── services/          # apiClient unificado + retry + timeout
│   │   ├── lib/               # cache, translations
│   │   └── types/             # Interfaces
│   ├── tests/                 # vitest + @testing-library/react + msw
│   ├── vitest.config.ts
│   ├── Dockerfile             # Multistage, non-root user
│   └── package.json           # npm test, npm run test:coverage
│
├── .github/workflows/ci.yml    # GitHub Actions: lint, test, build
├── docker-compose.yml          # PostgreSQL 15 + Redis 7 + backend + frontend
└── README.md                   # Este archivo
# Espera que ambos contenedores estén "healthy"
docker compose ps
```

**2. Backend:**

```bash
cd backend

# Virtualenv
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Dependencias (incluye redis ahora)
pip install -r requirements.txt

# .env ya debería estar configurado, pero verifica:
# DATABASE_URL=postgresql+asyncpg://pokedex_user:pokedex_password_dev@localhost:5432/pokedex
# REDIS_URL=redis://:pokedex_redis_pass_dev@localhost:6379/0
# SECRET_KEY=<clave-aleatoria-larga>
# CORS_ORIGINS=http://localhost:3000

# Arrancar
uvicorn main:app --reload
# API docs: http://localhost:8000/docs ✓
```

**3. Frontend:**

```bash
cd frontend
npm install
npm run dev
# App: http://localhost:3000 ✓
```

### Parar servicios

```bash
# Parar sin borrar datos
docker compose stop

# O destruir completamente (⚠️ borra datos locales)
docker compose down -v
```

**Más detalles:** Ver [DOCKER.md](DOCKER.md)

## 📋 Bloques de Mejora (Plan Completo)

Ver [plan en memoria](C:\Users\ALEXIS\.claude\plans\analiza-el-proyecto-y-mellow-cook.md).

| Bloque | Objetivo | Estado |
|--------|----------|--------|
| 1 | Hardening: CORS, SECRET_KEY, env vars, versiones pinned | ✅ Done |
| 2 | Calidad: Lint a cero (TypeScript + ESLint + ruff), logging | ⏳ Next |
| 3 | Refactor: Eliminar duplicación (routers genéricos, BaseModal, apiClient) | ⏳ Pending |
| 4 | Estado global & a11y: AuthContext, focus trap, loading boundaries | ⏳ Pending |
| 5 | Performance: Caché con TTL, retry con backoff, code splitting | ⏳ Pending |
| 6 | Tests: pytest backend, vitest frontend | ⏳ Pending |
| 7 | Infra: Docker (multi-stage), docker-compose, CI/CD GitHub Actions | ⏳ Pending |
| 8 | Observabilidad: Logging JSON, Sentry, rate limiting | ⏳ Pending |
| 9 | Features: Favoritos, Comparador, Team Builder, más juegos | ⏳ Pending |
| 10 | Documentación: README mejorado, Swagger limpio, CHANGELOG, LICENSE | ⏳ Pending |

## 🔧 Herramientas & Stack

**Backend:**
- FastAPI 0.135.1
- SQLAlchemy 2.0.48 (ORM async)
- asyncpg 0.31.0 (Postgres driver)
- python-jose + cryptography (JWT)
- passlib + bcrypt (password hashing)

**Frontend:**
- Next.js 16.1.6 (App Router)
- React 19.2.3
- TypeScript 5 (strict mode)
- ESLint 9 (next/core-web-vitals)
- Lucide React (icons)

**DB:**
- PostgreSQL (Supabase pooler en puerto 6543)
- Async SQLAlchemy + asyncpg

**Infra (Próxima fase):**
- Docker (Dockerfile multistage)
- docker-compose (orquestación local)
- GitHub Actions (CI: lint + tests + build)
- Sentry (error tracking)

## 📝 Estructura Git

- **Monorepo único:** `backend/` + `frontend/` bajo un `.git` en raíz.
- **Branch:** `master` (antes había `main` en backend y `master` en frontend, consolidado).
- **Remotes:** Pendiente de consolidar en GitHub (actualmente sigue siendo dos repos por URL).

## 🐛 Encontrado en Bloque 1

✅ **Arreglado:**
- CORS abierto a `["*"]` → restringido a `CORS_ORIGINS` env var
- `SECRET_KEY` hardcoded fallback (`"super-secret-poke-key-99"`) → obligatorio via env
- `datetime.utcnow()` (deprecated en Python 3.12+) → `datetime.now(timezone.utc)`
- `requirements.txt` sin pinning → todas las versiones fijadas al snapshot del venv
- Huérfano `backend/pokedex.db` (vacío, SQLite ya no usado) → borrado
- Duplicado `frontend/README_backend.md` → borrado

⏳ **Próximas fases:**
- Lint TypeScript (9 `any`s, imports sin usar, missing useEffect deps)
- Logging real en lugar de `print()` en routers
- Refactor de duplicación en routers y componentes

## 📞 Contacto

Desarrollado para camino a producción. Plan completo disponible; bloques ejecutables de forma incremental.

---

**Last updated:** 2026-05-10 | **Next:** Bloque 2 (Lint & Logging)
