from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
import httpx
import asyncio
import random
import logging
from services.pokeapi_service import PokeAPIService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/pokemon",
    tags=["Pokemon"]
)

@router.get("/")
async def list_pokemon(
    limit: int = 25, 
    offset: int = 0, 
    type: Optional[str] = Query(None, description="Filtrar por un tipo (ej., 'fire')"),
    types: List[str] = Query([], description="Filtrar por múltiples tipos (ej., ?types=fire&types=water)"),
    search: Optional[str] = Query(None, description="Buscar por nombre (coincidencia parcial)")
):
    """
    Lista de Pokémon con paginación y filtrado opcional por tipos o término de búsqueda.
    """
    try:
        # Combine all possible type filter sources into a single set
        filter_types_set = set()
        
        # From 'type' parameter (comma-separated string)
        if type:
            for t in type.split(','):
                if t.strip():
                    filter_types_set.add(t.strip().lower())
        
        # From 'types' parameters (multiple values)
        if types:
            for t in types:
                # Some clients might send ?types=fire,water instead of multiple ?types
                for sub_t in t.split(','):
                    if sub_t.strip():
                        filter_types_set.add(sub_t.strip().lower())
        
        filter_types = list(filter_types_set)

        # Case 1: Filtering by type(s)
        if filter_types:
            all_matching = await PokeAPIService.get_pokemon_by_types(filter_types)
            
            # Apply search filter if present
            if search:
                all_matching = [p for p in all_matching if search.lower() in p['name'].lower()]
            
            # Sort by name for consistency
            all_matching.sort(key=lambda x: x['name'])
            
            total = len(all_matching)
            paginated = all_matching[offset:offset+limit]
            
            return {
                "count": total,
                "next": None if offset + limit >= total else f"/pokemon/?limit={limit}&offset={offset+limit}" + "".join([f"&types={t}" for t in filter_types]) + (f"&search={search}" if search else ""),
                "previous": None if offset == 0 else f"/pokemon/?limit={limit}&offset={max(0, offset-limit)}" + "".join([f"&types={t}" for t in filter_types]) + (f"&search={search}" if search else ""),
                "results": paginated
            }

        # Case 2: Only search term filter (without type filter)
        if search:
            data = await PokeAPIService.get_pokemon_list(1500, 0) # Fetch more to allow searching
            all_matching = [p for p in data['results'] if search.lower() in p['name'].lower()]
            
            total = len(all_matching)
            paginated = all_matching[offset:offset+limit]
            
            return {
                "count": total,
                "next": None if offset + limit >= total else f"/pokemon/?limit={limit}&offset={offset+limit}&search={search}",
                "previous": None if offset == 0 else f"/pokemon/?limit={limit}&offset={max(0, offset-limit)}&search={search}",
                "results": paginated
            }

        # Default case: standard pagination
        return await PokeAPIService.get_pokemon_list(limit, offset)
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching pokemon: {e}", exc_info=True)
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Uno o más tipos especificados no fueron encontrados.")
        raise HTTPException(status_code=500, detail=f"Error de la API externa: {str(e)}")
    except (httpx.TimeoutException, httpx.HTTPError, ValueError) as e:
        logger.error(f"Error fetching pokemon: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al procesar los filtros: {str(e)}")

@router.get("/random")
async def get_random_pokemon():
    """
    Obtener todos los detalles de un Pokémon al azar.
    """
    try:
        return await PokeAPIService.get_random_pokemon()
    except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
        logger.error(f"Error fetching random pokemon: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al obtener un Pokémon aleatorio")

@router.get("/game/quiz")
async def get_quiz():
    """
    Generates a quiz optimized to reduce external API calls.
    """
    try:
        return await PokeAPIService.get_optimized_quiz()
    except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
        logger.error(f"Error generating quiz: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating quiz: {str(e)}")

@router.get("/batch/details")
async def get_batch_details(names: List[str] = Query(..., description="Lista de nombres para obtener detalles")):
    """
    Obtener detalles de muchos Pokémon a la vez de forma concurrente.
    """
    if not names:
        return []
        
    tasks = [PokeAPIService.get_pokemon_by_name_or_id(name) for name in names]
    
    # We use return_exceptions=True to avoid one failing request breaking the whole batch
    responses = await asyncio.gather(*tasks, return_exceptions=True)
    
    results = []
    for response in responses:
        if isinstance(response, Exception):
            continue
        results.append(response)
        
    return results

@router.get("/{name_or_id}")
async def get_pokemon_detail(name_or_id: str):
    """
    Obtener todos los detalles de un Pokémon específico por nombre o ID.
    """
    try:
        return await PokeAPIService.get_pokemon_by_name_or_id(name_or_id)
    except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
        logger.error(f"Error fetching pokemon detail for {name_or_id}: {e}", exc_info=True)
        raise HTTPException(status_code=404, detail="Pokémon no encontrado")
