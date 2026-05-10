from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# Cargar variables de entorno (leerá tu archivo .env localmente)
load_dotenv()

# Obtener URL desde .env (Requiere PostgreSQL/Supabase)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("WARNING: No DATABASE_URL found in .env. Se requiere conexión a Supabase.")

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
