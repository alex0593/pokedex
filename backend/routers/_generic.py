import logging
import httpx
from fastapi import APIRouter, HTTPException, Query
from services.pokeapi_service import PokeAPIService


def make_catalog_router(entity_type: str, entity_display_name: str = None) -> APIRouter:
    """
    Factory para generar routers de catálogo idénticos (moves, abilities, items, berries).

    Args:
        entity_type: nombre del endpoint en PokeAPI (e.g., "move", "ability")
        entity_display_name: nombre legible (e.g., "Move"), default: entity_type.capitalize()

    Returns:
        APIRouter con 3 endpoints: list, batch, detail
    """
    if not entity_display_name:
        entity_display_name = entity_type.capitalize()

    logger = logging.getLogger(f"routers.{entity_type}")
    router = APIRouter(prefix=f"/{entity_type}s", tags=[entity_display_name + "s"])

    @router.get("/")
    async def list_entities(limit: int = 25, offset: int = 0):
        """Lista paginada de entidades."""
        try:
            return await PokeAPIService.get_generic_data(entity_type, limit, offset)
        except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
            logger.error(f"Error fetching {entity_type}s: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/batch")
    async def get_batch(
        names: str = Query(..., description="Nombres o IDs separados por coma")
    ):
        """Obtener múltiples entidades a la vez."""
        try:
            id_list = [id.strip() for id in names.split(",")]
            return await PokeAPIService.get_generic_batch(entity_type, id_list)
        except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
            logger.error(f"Error fetching {entity_type}s batch: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/{name_or_id}")
    async def get_detail(name_or_id: str):
        """Obtener detalles de una entidad específica."""
        try:
            data = await PokeAPIService.get_generic_detail(entity_type, name_or_id)
            return PokeAPIService.transform_generic(data, entity_type)
        except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
            logger.error(f"Error fetching {entity_type} detail for {name_or_id}: {e}", exc_info=True)
            raise HTTPException(status_code=404, detail=f"{entity_display_name} not found")

    return router
