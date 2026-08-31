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
| `BACKEND_URL` | URL interna del backend para Next.js: `http://127.0.0.1:4004` |

Para generar `SECRET_KEY`:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 3. Construir las imágenes

```bash
docker compose -f docker-compose.prod.yml --env-file .env build
```

> El frontend usa un proxy de mismo origen en `/api/**`. `BACKEND_URL` se lee al ejecutar
> Next.js, por lo que no se expone al navegador ni requiere recompilar el frontend.

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

- Comprueba que `BACKEND_URL` en el proceso PM2 apunta a `http://127.0.0.1:4004`.
- Comprueba primero `curl http://127.0.0.1:4004/health` y después
  `curl http://127.0.0.1:4003/api/health` para validar el proxy completo.

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
   │                        │ proxy /api/** → http://127.0.0.1:4004/...
   │                        ▼  (desde el servidor Next.js)
   └── :4004 ──► [backend container :8000]
                            │
                    pokedex-network (bridge)
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
    [postgres :5432]             [redis :6379]
    (sin puertos externos)    (sin puertos externos)
```

> El navegador llama siempre a `/api/**` en el mismo origen. Next.js reenvía esas
> peticiones al backend usando la variable privada `BACKEND_URL`.
