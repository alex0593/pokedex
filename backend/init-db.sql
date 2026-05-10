-- Init script para PostgreSQL — crea extensiones y tablas base
-- Este archivo se ejecuta automáticamente cuando el contenedor arrancha

-- Extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Las tablas las crea SQLAlchemy en startup, pero aquí puedes agregar índices custom
-- o datos semilla (SEED) después de que la app las haya creado
