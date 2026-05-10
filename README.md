# 🔴 POKEDEX — Full Stack (FastAPI + Next.js)

**Versión:** 2.2.1 | **Estado:** En desarrollo camino a producción

Pokédex moderna con backend FastAPI + Supabase (PostgreSQL) y frontend Next.js 16 con React 19. Sistema de autenticación JWT, perfil de usuario, logros y mapas regionales interactivos.

## 📋 Estructura Monorepo

```
POKEDEX/
├── backend/          # FastAPI + asyncio + SQLAlchemy (PostgreSQL)
│   ├── routers/      # pokemon, abilities, moves, items, berries, evolutions, locations, stats, user, types
│   ├── services/     # pokeapi_service.py (HTTP async a PokeAPI)
│   ├── models/       # Schemas Pydantic + ORM SQLAlchemy
│   ├── utils/        # auth_utils.py (JWT, password hashing)
│   ├── database.py   # Conexión PostgreSQL async
│   ├── main.py       # FastAPI app + CORS middleware
│   ├── requirements.txt  # (pinned versions)
│   └── .env.example  # Template de variables
│
├── frontend/         # Next.js 16 (App Router) + React 19 + TypeScript
│   ├── src/
│   │   ├── app/      # Rutas: pokemon, items, berries, abilities, moves, game
│   │   ├── components/  # Cards, Modales, Navegación
│   │   ├── services/ # pokemonService.ts, catalogService.ts, authService.ts
│   │   ├── types/    # Interfaces TypeScript
│   │   └── utils/    # translations.ts
│   ├── package.json
│   ├── eslint.config.mjs
│   ├── next.config.ts
│   └── .env.example  # Template de variables
│
├── .gitignore        # Comprensivo (venv/, node_modules/, .env, __pycache__, etc.)
└── README.md         # Este archivo

## 🚀 Quick Start (Dev Local con Docker)

### Requisitos

- Docker + Docker Compose
- Python 3.10+ (backend local)
- Node.js 20+ (frontend local)
- Git

### Setup (5 minutos)

**1. Levanta PostgreSQL + Redis en Docker:**

```bash
docker compose up -d
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
