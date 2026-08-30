import logging
import os

import sentry_sdk
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import Base, engine
from routers import (
    abilities,
    berries,
    evolutions,
    favorites,
    game,
    items,
    locations,
    moves,
    pokemon,
    stats,
    types,
    user,
)
from utils.logging_config import setup_json_logging

load_dotenv()

# Configure logging (antes que Sentry para poder loguear el resultado del init)
logger = setup_json_logging("pokedex")
logging.getLogger("uvicorn").handlers.clear()
logging.getLogger("uvicorn.access").handlers.clear()

# Sentry — monitoreo de errores en producción (opcional).
# Solo se activa si SENTRY_DSN está definido en .env; sin él la app arranca igualmente.
_sentry_dsn = os.getenv("SENTRY_DSN")
if _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
        environment=os.getenv("ENVIRONMENT", "development"),
        send_default_pii=False,  # GDPR: no enviar IPs ni usuarios por defecto
    )
    logger.info("Sentry initialized", extra={"environment": os.getenv("ENVIRONMENT", "development")})
else:
    logger.info("Sentry DSN not configured — error tracking disabled")

_API_DESCRIPTION = """
## POKÉDEX PRO MAX — API

Backend proxy sobre [PokeAPI](https://pokeapi.co) con autenticación JWT, perfiles de usuario,
sistema de logros regionales y colección de favoritos.

### Grupos de endpoints

| Tag | Descripción |
|-----|-------------|
| **Pokémon** | Lista paginada, búsqueda, detalle completo, tipos, quiz |
| **Moves** | Movimientos con poder, precisión, PP y clase de daño |
| **Abilities** | Habilidades y Pokémon que las aprenden |
| **Items** | Objetos con coste, categoría y efecto |
| **Berries** | Bayas con datos de cultivo y firmeza |
| **Types** | Lista de todos los tipos |
| **Evolutions** | Cadenas de evolución |
| **Locations** | Áreas y localidades por región |
| **Users** | Registro, login JWT, perfil, logros, avatares |
| **Favorites** | CRUD de favoritos (requiere autenticación) |
| **Stats** | Estadísticas de trivia por usuario y ranking |
| **Health** | Estado del servicio |

### Autenticación

Los endpoints marcados con 🔒 requieren un **Bearer token** JWT.
Obtén el token en `POST /users/login` y añádelo como header:
```
Authorization: Bearer <token>
```
"""

app = FastAPI(
    title="Pokédex Pro Max API",
    description=_API_DESCRIPTION,
    version="2.3.0",
    contact={
        "name": "POKEDEX Dev",
        "url": "https://github.com/alex0593/pokedex",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_tags=[
        {"name": "Pokémon", "description": "Listado, búsqueda y detalle de Pokémon. Incluye filtros por tipo y endpoint de quiz."},
        {"name": "Moves", "description": "Movimientos: poder, precisión, PP y clase de daño."},
        {"name": "Abilities", "description": "Habilidades especiales y Pokémon que las poseen."},
        {"name": "Items", "description": "Objetos de juego: coste, categoría, efecto y sprite."},
        {"name": "Berrys", "description": "Bayas: tiempo de crecimiento, firmeza y cosecha."},
        {"name": "Types", "description": "Lista de todos los tipos Pokémon."},
        {"name": "Evolutions", "description": "Cadenas evolutivas completas."},
        {"name": "Locations", "description": "Áreas y localidades agrupadas por región."},
        {"name": "Users", "description": "Autenticación JWT, perfiles, logros regionales y avatares."},
        {"name": "Favorites", "description": "🔒 Colección personal de favoritos (Pokémon, objetos, bayas, habilidades, movimientos)."},
        {"name": "Stats", "description": "Estadísticas de trivia: ranking, racha y récord por región."},
        {"name": "Game", "description": "🔒 Aventura por Regiones: stages por tipo, progreso y medallas regionales."},
        {"name": "Health", "description": "Estado del servicio y versión."},
        {"name": "General", "description": "Información general de la API."},
    ],
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Security headers middleware — hosts configurables via ALLOWED_HOSTS env var
_allowed_hosts_env = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1")
allowed_hosts = [h.strip() for h in _allowed_hosts_env.split(",") if h.strip()]
render_hostname = os.getenv("RENDER_EXTERNAL_HOSTNAME", "").strip()
if render_hostname and render_hostname not in allowed_hosts:
    allowed_hosts.append(render_hostname)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=allowed_hosts,
)

# Custom middleware for security headers
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# CORS Configuration — orígenes permitidos vía env (coma-separados)
_cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()
if not _cors_origins_env:
    raise RuntimeError(
        "CORS_ORIGINS no definido. Configura una lista coma-separada en .env "
        "(ej: CORS_ORIGINS=http://localhost:3000,https://midominio.com)."
    )
allowed_origins = [o.strip() for o in _cors_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Servir Archivos Estaticos Locales
app.mount("/static", StaticFiles(directory="assets"), name="static")

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for Docker and load balancers."""
    return {
        "status": "healthy",
        "version": "2.3.0"
    }

# Initialize Database tables and Cache
@app.on_event("startup")
async def startup():
    from services.cache_service import CacheService

    # 1. Initialize Cache Service
    redis_url = os.getenv('REDIS_URL', 'redis://:pokedex_redis_pass_dev@localhost:6379/0')
    try:
        await CacheService.initialize(redis_url)
        logging.info('Redis cache service initialized')
    except Exception as e:
        logging.warning(f'Redis cache failed to initialize: {e}. Continuing without cache.')

    # 2. Database Sync
    # Con --workers >1, varios procesos ejecutan startup() en paralelo.
    # El primer worker que llega crea las tablas; los demás reciben un
    # IntegrityError de PostgreSQL por la race condition en el SERIAL/sequence.
    # Lo capturamos y continuamos — las tablas ya están creadas.
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logging.warning(f'create_all skipped (tables likely already exist): {e}')

# Clean up resources
@app.on_event("shutdown")
async def shutdown():
    from services.cache_service import CacheService
    from services.pokeapi_service import PokeAPIService

    await PokeAPIService.close()
    try:
        cache = CacheService.get_instance()
        await cache.close()
    except RuntimeError:
        pass

# Register Routers
app.include_router(pokemon.router)
app.include_router(types.router)
app.include_router(user.router)
app.include_router(favorites.router)
app.include_router(stats.router)
app.include_router(game.router)   # Aventura por regiones (stages + progreso)
app.include_router(moves.router)
app.include_router(abilities.router)
app.include_router(items.router)
app.include_router(berries.router)
app.include_router(locations.router)
app.include_router(evolutions.router)

@app.get("/", tags=["General"])
async def root():
    return {
        "message": "Pokédex Pro Max API v2.3.0",
        "version": "2.3.0",
        "docs": "/docs",
        "features": [
            "Auth JWT",
            "User Profiles & Achievements",
            "Favorites (Pokémon / Moves / Abilities / Items / Berries)",
            "Pokémon Search & Filters",
            "Regional Badges & Stats",
            "Quiz / Trivia",
        ],
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
