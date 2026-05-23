# Pokédex Pro Max

> Hub Pokémon fullstack: explora la Pokédex, objetos, bayas, habilidades y movimientos,
> colecciona favoritos y pon a prueba tus conocimientos con el mini-juego de trivia.

![version](https://img.shields.io/badge/version-2.3.0-blue)
![license](https://img.shields.io/badge/license-MIT-green)
![tests](https://img.shields.io/badge/tests-passing-brightgreen)
![stack](https://img.shields.io/badge/stack-FastAPI%20%2B%20Next.js-purple)

---

## ✨ Features

| Módulo | Descripción |
|--------|-------------|
| 🔍 **Pokédex** | 1000+ Pokémon con imágenes, tipos, stats y habilidades |
| 🎒 **Objetos** | Catálogo completo con coste, categoría y efecto |
| 🍒 **Bayas** | Todas las bayas con datos de cultivo y firmeza |
| ✨ **Habilidades** | Descripción y Pokémon que las poseen |
| ⚔️ **Movimientos** | Poder, precisión, PP y clase de daño |
| ❤️ **Favoritos** | Colección personal sincronizada con el backend |
| 🏆 **Logros** | Medallas regionales por aciertos en trivia |
| 🎮 **Trivia** | Mini-juego "¿Quién es ese Pokémon?" con filtros de región y tipo |
| 👤 **Perfiles** | Sistema de usuarios con avatar, racha y estadísticas |

---

## 🚀 Quick Start — 5 minutos con Docker

```bash
git clone https://github.com/alex0593/pokedex.git
cd pokedex

# Copiar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env: añadir SECRET_KEY (ver sección Variables de Entorno)

# Levantar toda la stack
docker compose up -d

# Esperar a que los servicios estén HEALTHY (~30 s)
docker compose ps
```

Accesos:

| Servicio | URL |
|----------|-----|
| 🌐 Frontend | http://localhost:3000 |
| ⚙️ API | http://localhost:8000 |
| 📚 Swagger UI | http://localhost:8000/docs |
| 🔬 ReDoc | http://localhost:8000/redoc |

---

## 📐 Arquitectura

```mermaid
graph TB
    subgraph "Cliente (Browser)"
        FE["Next.js 16\nApp Router + React 19\nTypeScript strict"]
    end

    subgraph "Backend (Docker)"
        BE["FastAPI 0.135\nPython 3.14\nSQLAlchemy async"]
        PG[("PostgreSQL 15\npokedex DB")]
        RD[("Redis 7\nCache TTL 24h")]
    end

    subgraph "Externo"
        PA["PokeAPI\nhttps://pokeapi.co"]
    end

    FE -- "HTTP REST\nJWT Bearer" --> BE
    BE -- "asyncpg" --> PG
    BE -- "aioredis" --> RD
    BE -- "httpx (pooled)\nretry + backoff" --> PA

    style FE fill:#0070f3,color:#fff
    style BE fill:#009688,color:#fff
    style PG fill:#336791,color:#fff
    style RD fill:#d82c20,color:#fff
    style PA fill:#ef5350,color:#fff
```

### Flujo de datos

```
Browser → [Next.js apiClient (retry+timeout)] → FastAPI router
       → [PokeAPIService singleton (httpx pool)] → PokeAPI
       → [CacheService (Redis)] ← responde si en caché
       → [SQLAlchemy async] → PostgreSQL (auth/perfiles/favoritos)
```

---

## 🏗️ Estructura del monorepo

```
pokedex/
├── backend/
│   ├── main.py                  # App FastAPI + middlewares + startup
│   ├── database.py              # Motor SQLAlchemy async
│   ├── routers/
│   │   ├── _generic.py          # Factory: 3 endpoints × 4 catálogos
│   │   ├── pokemon.py           # Lista, búsqueda, detalle, quiz
│   │   ├── favorites.py         # CRUD favoritos (JWT protegido)
│   │   ├── user.py              # Auth, perfil, logros, avatares
│   │   └── ...                  # moves, abilities, items, berries, types, …
│   ├── services/
│   │   ├── pokeapi_service.py   # Singleton httpx + retry exponencial
│   │   └── cache_service.py     # Redis singleton con TTL
│   ├── models/
│   │   ├── user_db.py           # ORM: User, UserStats, Achievement, UserFavorite
│   │   └── user_schemas.py      # Schemas Pydantic v2
│   ├── utils/
│   │   ├── auth_utils.py        # JWT HS256 + bcrypt
│   │   ├── deps.py              # get_current_user dependency
│   │   └── logging_config.py    # JSON logging
│   ├── tests/                   # pytest (16 tests)
│   ├── Dockerfile               # Multistage, non-root
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router
│   │   │   ├── pokemon/         # Pokédex con infinite scroll
│   │   │   ├── favorites/       # Colección personal agrupada
│   │   │   ├── game/            # Mini-juego trivia
│   │   │   └── ...              # items, berries, abilities, moves
│   │   ├── components/
│   │   │   ├── BaseModal.tsx    # Modal accesible (focus trap, ARIA, ESC)
│   │   │   ├── FavoriteButton.tsx  # Botón ❤️/🤍 en cada Card
│   │   │   └── ...              # Cards + Modales por entidad
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx  # Estado global auth (multi-tab sync)
│   │   │   └── FavoritesContext.tsx  # Favoritos con actualizaciones optimistas
│   │   ├── hooks/
│   │   │   └── useTriviaGame.ts # Lógica del mini-juego extraída
│   │   ├── lib/
│   │   │   ├── apiClient.ts     # Fetch unificado (retry, timeout, backoff)
│   │   │   └── cache.ts         # Cache en memoria (pokemonCache, catalogCache)
│   │   └── services/            # pokemonService, catalogService, favoritesService
│   ├── tests/                   # vitest + @testing-library/react
│   ├── Dockerfile               # Multistage, non-root
│   └── package.json
│
├── .github/workflows/ci.yml     # GitHub Actions: lint + test + docker build
├── docker-compose.yml           # Stack completa: postgres + redis + backend + frontend
├── docker-compose.prod.yml      # Variante producción
├── nginx/                       # Config nginx para ultimate-poke.sytes.net
├── scripts/backup.sh            # pg_dump con rotación de 7 backups
├── CHANGELOG.md
└── README.md
```

---

## 🔧 Desarrollo local (sin Docker)

### Requisitos previos

- Python 3.12+
- Node.js 20+
- PostgreSQL 15 + Redis 7 (o usar `docker compose up postgres redis -d`)

### Backend

```bash
cd backend

# Entorno virtual
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Dependencias
pip install -r requirements.txt

# Variables de entorno
cp .env.example .env
# Editar .env — ver sección "Variables de Entorno"

# Arrancar
uvicorn main:app --reload
# → http://localhost:8000/docs
```

### Frontend

```bash
cd frontend

npm install
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
# → http://localhost:3000
```

---

## 🔑 Variables de Entorno

### Backend (`backend/.env`)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `SECRET_KEY` | ✅ | Clave JWT — `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `DATABASE_URL` | ✅ | `postgresql+asyncpg://user:pass@host:5432/db` |
| `CORS_ORIGINS` | ✅ | `http://localhost:3000` (coma-separados) |
| `REDIS_URL` | ✅ | `redis://:pass@localhost:6379/0` (degrada sin caché si falla) |
| `ALLOWED_HOSTS` | ✅ | `localhost,127.0.0.1` (coma-separados) |
| `ENVIRONMENT` | — | `development` \| `production` |
| `SENTRY_DSN` | — | DSN de Sentry (opt-in, deshabilitado si no se define) |
| `SENTRY_TRACES_SAMPLE_RATE` | — | `0.1` (10 % de trazas) |

### Frontend (`frontend/.env.local`)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL del backend |
| `NEXT_PUBLIC_SENTRY_DSN` | — | DSN Sentry frontend (opt-in) |

---

## 🧪 Tests

```bash
# Backend — 16 tests
cd backend
pytest -v

# Frontend — tests unitarios
cd frontend
npm run test:run          # single run
npm run test:coverage     # con informe de cobertura

# Lint
cd backend && ruff check .          # Python
cd frontend && npm run lint         # ESLint + TypeScript
```

---

## 🐳 Docker

```bash
# Stack completa
docker compose up -d

# Ver logs
docker compose logs -f backend
docker compose logs -f frontend

# Parar sin borrar datos
docker compose stop

# ⚠️ Destruir + borrar volúmenes (borra la DB)
docker compose down -v

# Backup manual de la base de datos
bash scripts/backup.sh
```

---

## 🔒 Seguridad

- **CORS** configurado vía env, sin wildcards en producción
- **JWT HS256** con expiración de 7 días; `SECRET_KEY` obligatorio (fail-fast)
- **TrustedHostMiddleware** para whitelist de hosts
- **Security headers**: HSTS, X-Frame-Options DENY, CSP, X-Content-Type-Options
- **Rate limiting** con `slowapi` (configurable por endpoint)
- **Contraseñas** hasheadas con bcrypt
- **GDPR**: `send_default_pii=False` en Sentry

---

## 📡 API — Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/pokemon/` | Lista paginada con filtro por tipo/nombre |
| `GET` | `/pokemon/{id}` | Detalle completo con sprites y traducciones |
| `GET` | `/pokemon/game/quiz` | Pregunta de trivia aleatoria |
| `GET` | `/moves/` | Lista de movimientos |
| `GET` | `/abilities/` | Lista de habilidades |
| `GET` | `/items/` | Lista de objetos |
| `GET` | `/berries/` | Lista de bayas |
| `POST` | `/users/register` | Registro de usuario |
| `POST` | `/users/login` | Login → JWT token |
| `GET` | `/users/profile` | Perfil + logros + estadísticas |
| `GET` | `/users/favorites/` 🔒 | Listar favoritos del usuario |
| `POST` | `/users/favorites/` 🔒 | Añadir favorito (idempotente) |
| `DELETE` | `/users/favorites/{type}/{name}` 🔒 | Eliminar favorito |
| `GET` | `/health` | Estado del servicio |

> 🔒 = requiere `Authorization: Bearer <token>`

Documentación interactiva completa en **http://localhost:8000/docs**

---

## 🤝 Contribuir

1. Haz fork del repositorio
2. Crea una rama: `git checkout -b feature/mi-feature`
3. Commit: `git commit -m "feat: descripción"`
4. Push: `git push origin feature/mi-feature`
5. Abre un Pull Request

Asegúrate de que pasen todos los checks:
```bash
cd backend && ruff check . && pytest
cd frontend && npm run lint && npx tsc --noEmit && npm run test:run
```

---

## 📄 Licencia

MIT © 2026 POKEDEX Dev — ver [LICENSE](LICENSE)

---

*Construido sobre [PokeAPI](https://pokeapi.co) — todos los datos de Pokémon son propiedad de Nintendo / Game Freak / The Pokémon Company.*
