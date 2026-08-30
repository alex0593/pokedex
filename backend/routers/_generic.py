import logging
from datetime import timedelta

import httpx
from fastapi import APIRouter, HTTPException, Query, Response

from services.cache_service import CacheService
from services.pokeapi_service import PokeAPIService


def make_catalog_router(
    entity_type: str,
    entity_display_name: str = None,
    route_prefix: str = None,
) -> APIRouter:
    """
    Factory para generar routers de catálogo idénticos (moves, abilities, items, berries).

    Args:
        entity_type: nombre del endpoint en PokeAPI (e.g., "move", "ability")
        entity_display_name: nombre legible (e.g., "Move"), default: entity_type.capitalize()
        route_prefix: prefijo de ruta explícito (e.g., "/abilities"). Si no se proporciona,
            se genera como "/{entity_type}s" (funciona bien para formas regulares).

    Returns:
        APIRouter con 3 endpoints: list, batch, detail — todos con Redis cache.
    """
    if not entity_display_name:
        entity_display_name = entity_type.capitalize()

    prefix = route_prefix if route_prefix else f"/{entity_type}s"
    logger = logging.getLogger(f"routers.{entity_type}")
    router = APIRouter(prefix=prefix, tags=[entity_display_name + "s"])

    # TTLs
    LIST_TTL   = timedelta(hours=1)    # listas paginadas cambian poco
    DETAIL_TTL = timedelta(hours=24)   # detalles son estables

    def _cache():
        """Acceso defensivo al singleton — devuelve None si no está inicializado."""
        try:
            return CacheService.get_instance()
        except RuntimeError:
            return None

    @router.get("/")
    async def list_entities(limit: int = 25, offset: int = 0, response: Response = None):
        """Lista paginada de entidades (con cache Redis 1 h)."""
        cache_key = f"catalog:{entity_type}:list:{limit}:{offset}"
        cache = _cache()

        if cache:
            cached = await cache.get(cache_key)
            if cached is not None:
                if response:
                    response.headers['Cache-Control'] = 'public, max-age=3600'
                return cached

        try:
            data = await PokeAPIService.get_generic_data(entity_type, limit, offset)
            if cache:
                await cache.set(cache_key, data, LIST_TTL)
            if response:
                response.headers['Cache-Control'] = 'public, max-age=3600'
            return data
        except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
            logger.error(f"Error fetching {entity_type}s: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=str(e)) from e

    @router.get("/batch")
    async def get_batch(
        names: str = Query(..., description="Nombres o IDs separados por coma"),
        response: Response = None
    ):
        """Obtener múltiples entidades a la vez (con cache Redis 24 h por nombre)."""
        id_list = [id.strip() for id in names.split(",") if id.strip()]
        cache = _cache()

        # Intentar servir todo desde caché
        cached_items = [None] * len(id_list)
        if cache:
            cache_keys = [f"catalog:{entity_type}:detail:{name.lower()}" for name in id_list]
            cached_items = await cache.get_many(cache_keys)
            if all(v is not None for v in cached_items):
                if response:
                    response.headers['Cache-Control'] = 'public, max-age=3600'
                return cached_items

        try:
            missing_names = [
                name for name, value in zip(id_list, cached_items, strict=False) if value is None
            ]
            fetched = await PokeAPIService.get_generic_batch(entity_type, missing_names)
            fetched_by_name = {}
            for item in fetched:
                canonical_name = str(item.get("original_name") or item.get("name", "")).lower()
                if canonical_name:
                    fetched_by_name[canonical_name] = item
                if item.get("id") is not None:
                    fetched_by_name[str(item["id"])] = item
            data = []
            for name, cached_item in zip(id_list, cached_items, strict=False):
                item = cached_item or fetched_by_name.get(name.lower())
                if item is not None:
                    data.append(item)

            # Guardar cada ítem en caché para que el detail endpoint también lo aproveche
            if cache:
                cache_values = {}
                for item in fetched:
                    item_name = item.get("original_name") or item.get("name", "").lower()
                    if item_name:
                        cache_values[f"catalog:{entity_type}:detail:{item_name.lower()}"] = item
                await cache.set_many(cache_values, DETAIL_TTL)
            if response:
                response.headers['Cache-Control'] = 'public, max-age=3600'
            return data
        except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
            logger.error(f"Error fetching {entity_type}s batch: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=str(e)) from e

    @router.get("/{name_or_id}")
    async def get_detail(name_or_id: str, response: Response = None):
        """Obtener detalles de una entidad específica (con cache Redis 24 h)."""
        cache_key = f"catalog:{entity_type}:detail:{name_or_id.lower()}"
        cache = _cache()

        if cache:
            cached = await cache.get(cache_key)
            if cached is not None:
                if response:
                    response.headers['Cache-Control'] = 'public, max-age=86400'
                return cached

        try:
            data = await PokeAPIService.get_generic_detail(entity_type, name_or_id)
            result = PokeAPIService.transform_generic(data, entity_type)
            if cache:
                await cache.set(cache_key, result, DETAIL_TTL)
            if response:
                response.headers['Cache-Control'] = 'public, max-age=86400'
            return result
        except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
            logger.error(f"Error fetching {entity_type} detail for {name_or_id}: {e}", exc_info=True)
            raise HTTPException(status_code=404, detail=f"{entity_display_name} not found") from e

    return router
