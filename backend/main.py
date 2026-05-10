import os
import logging
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import pokemon, types, user, stats, moves, abilities, items, berries, locations, evolutions
from database import engine, Base
import uvicorn

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

app = FastAPI(
    title="Pokedex API - Backend PokeAPI",
    description="Backend con sistema de perfiles, logros y estadísticas.",
    version="2.2.1",
)

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

# Initialize Database tables
@app.on_event("startup")
async def startup():
    from services.pokeapi_service import PokeAPIService
    

    
    # 2. Database Sync
    async with engine.begin() as conn:
        # Create all tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)

# Clean up resources
@app.on_event("shutdown")
async def shutdown():
    from services.pokeapi_service import PokeAPIService
    await PokeAPIService.close()

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
