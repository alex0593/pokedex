# Guía de Despliegue en Servidor

Esta guía explica cómo desplegar la Pokédex en un servidor limpio usando Docker Compose.

| Servicio   | Puerto externo | Puerto interno |
|------------|---------------|----------------|
| Frontend   | **4003**      | 3000           |
| Backend    | **4004**      | 8000           |
| PostgreSQL | —             | 5432 (interno) |
| Redis      | —             | 6379 (interno) |

> PostgreSQL y Redis **no exponen puertos** al exterior. Solo son accesibles entre contenedores dentro de `pokedex-network`.

---

## Requisitos previos

- Docker Engine ≥ 24 y Docker Compose Plugin v2 instalados
- Puerto 4003 y 4004 abiertos en el firewall del servidor
- Git instalado

---

## Pasos de despliegue

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/pokedex.git
cd pokedex
```

### 2. Configurar las variables de entorno

```bash
cp backend/.env.prod.example .env
```

Edita `.env` y **reemplaza todos los valores marcados** con `CAMBIA_ESTO` y `MI_IP_O_DOMINIO`:

| Variable | Qué poner |
|---|---|
| `POSTGRES_PASSWORD` | Password seguro para la BD |
| `REDIS_PASSWORD` | Password seguro para Redis |
| `SECRET_KEY` | Clave aleatoria para JWT (ver más abajo) |
| `CORS_ORIGINS` | URL del frontend: `http://IP_SERVIDOR:4003` |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1,IP_SERVIDOR` |
| `NEXT_PUBLIC_API_URL` | URL del backend: `http://IP_SERVIDOR:4004` |

Para generar `SECRET_KEY`:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 3. Construir las imágenes

```bash
docker compose -f docker-compose.prod.yml --env-file .env build
```

> El build del frontend puede tardar 2-4 minutos la primera vez.  
> `NEXT_PUBLIC_API_URL` se embebe en el bundle en este paso — si cambias la IP del servidor necesitarás rebuildar.

### 4. Levantar los contenedores

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

### 5. Verificar que todo está sano

```bash
# Estado de los 4 contenedores
docker compose -f docker-compose.prod.yml ps

# Health check del backend
curl http://localhost:4004/health
# Esperado: {"status":"healthy","version":"2.2.1"}

# Frontend responde
curl -o /dev/null -s -w "%{http_code}" http://localhost:4003
# Esperado: 200
```

---

## Operaciones habituales

### Ver logs en tiempo real

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Reiniciar un servicio

```bash
docker compose -f docker-compose.prod.yml restart backend
```

### Actualizar a una nueva versión

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env build
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

### Parar todo (sin borrar datos)

```bash
docker compose -f docker-compose.prod.yml down
```

### Borrar todo incluyendo volúmenes (⚠ borra la BD)

```bash
docker compose -f docker-compose.prod.yml down -v
```

---

## Acceso a la base de datos

```bash
# Shell PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U ${POSTGRES_USER} -d ${POSTGRES_DB:-pokedex}

# Redis CLI
docker compose -f docker-compose.prod.yml exec redis \
  redis-cli -a ${REDIS_PASSWORD}
```

---

## Troubleshooting

### El frontend no puede llegar al backend

- Comprueba que `NEXT_PUBLIC_API_URL` en `.env` apunta a la IP pública del servidor (no `localhost`).
- `localhost` dentro del contenedor frontend hace referencia **al propio contenedor**, no al backend.
- Si cambias la URL deberás rebuildar: `docker compose ... build frontend`.

### El backend no arranca

- Revisa los logs: `docker compose -f docker-compose.prod.yml logs backend`
- Errores frecuentes:
  - `CORS_ORIGINS no definido` → la variable no está en `.env`
  - `SECRET_KEY` ausente → añádela al `.env`
  - `Connection refused` a postgres → espera a que el healthcheck de postgres esté `healthy`

### Puerto ocupado

```bash
# Ver qué proceso usa el puerto 4003 o 4004
ss -tlnp | grep 400
```

---

## Arquitectura de red

```
Internet
   │
   ├── :4003 ──► [frontend container :3000]
   │                        │ fetch() http://IP:4004/...
   │                        ▼  (desde el navegador del usuario)
   └── :4004 ──► [backend container :8000]
                            │
                    pokedex-network (bridge)
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
    [postgres :5432]             [redis :6379]
    (sin puertos externos)    (sin puertos externos)
```

> **Nota sobre NEXT_PUBLIC_API_URL**: las llamadas al backend las hace el **navegador del usuario**, no el contenedor del frontend. Por eso la URL debe ser la IP/dominio público del servidor, no el nombre del servicio Docker (`backend`).
