from fastapi import APIRouter, HTTPException, Query
import httpx
import logging
from services.pokeapi_service import PokeAPIService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/abilities", tags=["Abilities"])

@router.get("/")
async def list_abilities(limit: int = 25, offset: int = 0):
    try:
        return await PokeAPIService.get_generic_data("ability", limit, offset)
    except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
        logger.error(f"Error fetching abilities: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/batch")
async def get_abilities_batch(names: str = Query(..., description="Nombres o IDs separados por coma")):
    try:
        id_list = [id.strip() for id in names.split(",")]
        return await PokeAPIService.get_generic_batch("ability", id_list)
    except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
        logger.error(f"Error fetching abilities: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{name_or_id}")
async def get_ability_detail(name_or_id: str):
    try:
        data = await PokeAPIService.get_generic_detail("ability", name_or_id)
        return PokeAPIService.transform_generic(data, "ability")
    except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
        logger.error(f"Error fetching ability detail for {name_or_id}: {e}", exc_info=True)
        raise HTTPException(status_code=404, detail="Ability not found")
