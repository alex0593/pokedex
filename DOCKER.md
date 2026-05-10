# 🐳 Guía Docker — POKEDEX

Usa `docker-compose` para levantar PostgreSQL 15 + Redis 7 localmente, con volúmenes persistentes y healthchecks.

## Quick Start

### 1. Asegúrate de tener Docker + Docker Compose

```bash
docker --version
docker compose --version
```

Si no tienes Docker: [Instala Docker Desktop](https://www.docker.com/products/docker-desktop).

### 2. Inicia los servicios

Desde la **raíz de POKEDEX**:

```bash
docker compose up -d

# Logs en tiempo real (opcional):
docker compose logs -f postgres redis
```

**Esperado:**
```
✓ pokedex-db    is healthy
✓ pokedex-cache is healthy
```

### 3. Verifica conectividad

```bash
# PostgreSQL (debe responder "pong" tras algunos intentos)
docker compose exec postgres pg_isready -U pokedex_user
# Output: accepting connections ✓

# Redis
docker compose exec redis redis-cli ping
# Output: PONG ✓
```

### 4. Levanta el backend (con DB corriendo)

```bash
cd backend

# Asegúrate de que .env tiene:
# DATABASE_URL=postgresql+asyncpg://pokedex_user:pokedex_password_dev@localhost:5432/pokedex
# REDIS_URL=redis://:pokedex_redis_pass_dev@localhost:6379/0
# (Ya debería estar si ejecutaste los pasos de Bloque 1)

# Virtualenv
source venv/bin/activate
pip install -r requirements.txt

# Arrancar FastAPI (creará tablas automáticamente)
uvicorn main:app --reload
# API: http://localhost:8000/docs ✓
```

### 5. Frontend

```bash
cd frontend
npm run dev
# App: http://localhost:3000 ✓
```

---

## Estructura docker-compose.yml

### PostgreSQL 15

- **Image:** `postgres:15-alpine` (ligera, ~160MB)
- **Container:** `pokedex-db`
- **Usuario:** `pokedex_user`
- **Password:** `pokedex_password_dev`
- **DB:** `pokedex`
- **Puerto:** 5432 (localhost)
- **Volumen:** `postgres_data:/var/lib/postgresql/data` (persistente)
- **Healthcheck:** `pg_isready` cada 10s

#### Init Script

`backend/init-db.sql` se ejecuta **una sola vez** en primer arranque. Aquí puedes:
- Crear extensiones (`uuid-ossp`, `pgcrypto`)
- Seed data (después de que la app haya creado tablas)

### Redis 7

- **Image:** `redis:7-alpine` (ligera, ~30MB)
- **Container:** `pokedex-cache`
- **Password:** `pokedex_redis_pass_dev`
- **Puerto:** 6379 (localhost)
- **Volumen:** `redis_data:/data` (persistente con AOF)
- **Healthcheck:** `redis-cli incr ping` cada 10s

#### Comandos útiles

```bash
# Monitor en tiempo real
docker compose exec redis redis-cli
> MONITOR

# Limpiar todo (cuidado!)
> FLUSHDB

# Ver tamaño DB
> DBSIZE

# Salir
> EXIT
```

---

## Comandos Útiles

```bash
# Ver estado
docker compose ps

# Ver logs
docker compose logs postgres    # Solo PostgreSQL
docker compose logs redis       # Solo Redis
docker compose logs -f          # Todos, en tiempo real

# Parar servicios (sin borrar volúmenes)
docker compose stop

# Reiniciar
docker compose restart

# Destruir servicios + volúmenes (⚠️ BORRA DATOS)
docker compose down -v

# Acceso a shell de la DB
docker compose exec postgres psql -U pokedex_user -d pokedex

# Acceso a Redis CLI
docker compose exec redis redis-cli -a pokedex_redis_pass_dev

# Inspeccionar volumen
docker volume inspect pokedex_postgres_data
```

---

## Solución de Problemas

### El backend no puede conectar a la DB

**Síntoma:** `sqlalchemy.exc.InvalidRequestError: asyncpg error`

**Causas comunes:**
1. Docker containers no están corriendo → `docker compose ps`
2. DATABASE_URL apunta a `localhost` en lugar de `postgres` (el hostname Docker)
   - En localhost/máquina: `postgresql+asyncpg://...@localhost:5432/...`
   - Dentro de Docker: `postgresql+asyncpg://...@postgres:5432/...`
3. Firewall bloquea puerto 5432

**Solución:**
```bash
# Verifica connectividad desde tu máquina
psql -h localhost -U pokedex_user -d pokedex -c "SELECT 1"
# Ingresa password: pokedex_password_dev

# Si funciona, el problema es la app, no Docker
```

### El backend no ve Redis

**Síntoma:** `ConnectionError: Error 111 connecting to redis:6379`

**Causas:**
1. Redis container no está saludable → `docker compose ps`
2. REDIS_URL apunta a la IP equivocada

**Solución:**
```bash
# Verifica Redis
docker compose exec redis redis-cli -a pokedex_redis_pass_dev ping
# Output: PONG ✓
```

### Volúmenes perdidos o corruptos

```bash
# Borrar volúmenes (cuidado: perderás datos locales)
docker compose down -v

# Reiniciar limpio
docker compose up -d
```

---

## Migrando de Supabase a Docker Local

Si venías usando Supabase:

1. **Backup de datos Supabase** (si importante):
   ```bash
   pg_dump postgresql://user:pass@host/db > backup.sql
   ```

2. **Actualiza .env:**
   ```
   # De:
   DATABASE_URL=postgresql+asyncpg://...@aws-*.supabase.com:6543/postgres

   # A:
   DATABASE_URL=postgresql+asyncpg://pokedex_user:pokedex_password_dev@localhost:5432/pokedex
   ```

3. **Inicia Docker:**
   ```bash
   docker compose up -d
   ```

4. **El backend recreará tablas** en primer startup (SQLAlchemy `create_all`).

5. **Si necesitabas seed data de Supabase:**
   ```bash
   # Restaurar en Docker
   docker compose exec postgres psql -U pokedex_user -d pokedex < backup.sql
   ```

---

## Network Docker

El `docker-compose.yml` crea una network llamada `pokedex-network`. Dentro de ella:
- `postgres` es alcanzable como `postgres:5432`
- `redis` es alcanzable como `redis:6379`

Esto es automático — los servicios se descubren por nombre DNS interno.

---

## Para Producción

En prod, reemplaza:

```yaml
# En docker-compose.yml, o vía variables de entorno:
- POSTGRES_PASSWORD=<strong-password-aqui>
- Comando Redis: redis-server --requirepass <strong-password-aqui>
- Usa managed services (AWS RDS, Azure Database, Heroku Postgres) en lugar de contenedor
- O usa Kubernetes + StatefulSets para replicas de PostgreSQL
```

Ver `Bloque 7 — Infraestructura` en el plan para setup de producción.

---

**Last updated:** 2026-05-10
