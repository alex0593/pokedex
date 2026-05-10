from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# Cargar variables de entorno (leerá tu archivo .env localmente)
load_dotenv()

# Obtener URL desde .env (Requiere PostgreSQL local en Docker o remoto)
# - Dev local (docker-compose):  postgresql+asyncpg://pokedex_user:pokedex_password_dev@localhost:5432/pokedex
# - Dentro de Docker container:  postgresql+asyncpg://pokedex_user:pokedex_password_dev@postgres:5432/pokedex
# - Producción:                  postgresql+asyncpg://user:pass@prod-host/prod_db
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("ERROR: DATABASE_URL no configurado en .env. Requerido para conectar a PostgreSQL.")

# Inicializar motor de base de datos asíncrono
# Se deshabilita completamente el caché de declaraciones preparadas de asyncpg
# para evitar choques con el PgBouncer (pooler de transacciones) de Supabase en puerto 6543
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={
        "prepared_statement_cache_size": 0,
        "statement_cache_size": 0
    }
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
