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

app = FastAPI(
    title="Pokedex API - Backend PokeAPI",
    description="Backend con sistema de perfiles, logros y estadísticas.",
    version="2.2.1",
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Security headers middleware — hosts configurables via ALLOWED_HOSTS env var
_allowed_hosts_env = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1")
allowed_hosts = [h.strip() for h in _allowed_hosts_env.split(",") if h.strip()]
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
        "version": "2.2.1"
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
    async with engine.begin() as conn:
        # Create all tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)

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
app.include_router(stats.router)
app.include_router(moves.router)
app.include_router(abilities.router)
app.include_router(items.router)
app.include_router(berries.router)
app.include_router(locations.router)
app.include_router(evolutions.router)

@app.get("/", tags=["General"])
async def root():
    return {
        "message": "¡Pokedex API V2.2.1 - Con Sistema de Logros y Mapeo Regional!",
        "version": "2.2.1",
        "features": ["Auth", "Stats", "Achievements", "Pokemon Search", "Region Maps"]
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
