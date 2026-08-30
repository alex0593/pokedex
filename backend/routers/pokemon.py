import asyncio
import logging
from datetime import timedelta
from typing import List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query, Response

from services.cache_service import CacheService
from services.pokeapi_service import PokeAPIService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pokemon", tags=["Pokemon"])
DETAIL_TTL = timedelta(hours=24)


def _cache():
    try:
        return CacheService.get_instance()
    except RuntimeError:
        return None


def _detail_key(identifier: str) -> str:
    return f"pokemon:detail:{identifier.lower()}"


async def _cache_pokemon_details(items: List[dict]) -> None:
    cache = _cache()
    if not cache:
        return
    values = {}
    for item in items:
        identifiers = [item.get("original_name"), item.get("name"), item.get("id")]
        for identifier in identifiers:
            if identifier is not None:
                values[_detail_key(str(identifier))] = item
    await cache.set_many(values, DETAIL_TTL)


@router.get("/")
async def list_pokemon(
    limit: int = 25,
    offset: int = 0,
    type: Optional[str] = Query(None, description="Filtrar por un tipo (ej., 'fire')"),
    types: List[str] = Query([], description="Filtrar por múltiples tipos"),
    search: Optional[str] = Query(None, description="Buscar por nombre (coincidencia parcial)"),
    response: Response = None,
):
    """Lista de Pokémon con paginación y filtrado opcional por tipos o término de búsqueda."""
    try:
        # Combine all possible type filter sources into a single set
        filter_types_set: set[str] = set()

        if type:
            for t in type.split(","):
                if t.strip():
                    filter_types_set.add(t.strip().lower())

        if types:
            for t in types:
                for sub_t in t.split(","):
                    if sub_t.strip():
                        filter_types_set.add(sub_t.strip().lower())

        filter_types = list(filter_types_set)

        # Case 1: Filtering by type(s)
        if filter_types:
            all_matching = await PokeAPIService.get_pokemon_by_types(filter_types)

            if search:
                all_matching = [p for p in all_matching if search.lower() in p["name"].lower()]

            all_matching.sort(key=lambda x: x["name"])
            total = len(all_matching)
            paginated = all_matching[offset : offset + limit]
            type_qs = "".join([f"&types={t}" for t in filter_types])
            search_qs = f"&search={search}" if search else ""

            result = {
                "count": total,
                "next": (
                    None
                    if offset + limit >= total
                    else f"/pokemon/?limit={limit}&offset={offset+limit}{type_qs}{search_qs}"
                ),
                "previous": (
                    None
                    if offset == 0
                    else f"/pokemon/?limit={limit}&offset={max(0, offset-limit)}{type_qs}{search_qs}"
                ),
                "results": paginated,
            }
            if response:
                response.headers["Cache-Control"] = "public, max-age=3600"
            return result

        # Case 2: Only search term filter
        if search:
            data = await PokeAPIService.get_pokemon_list(1500, 0)
            all_matching = [p for p in data["results"] if search.lower() in p["name"].lower()]
            total = len(all_matching)
            paginated = all_matching[offset : offset + limit]

            result = {
                "count": total,
                "next": (
                    None
                    if offset + limit >= total
                    else f"/pokemon/?limit={limit}&offset={offset+limit}&search={search}"
                ),
                "previous": (
                    None
                    if offset == 0
                    else f"/pokemon/?limit={limit}&offset={max(0, offset-limit)}&search={search}"
                ),
                "results": paginated,
            }
            if response:
                response.headers["Cache-Control"] = "public, max-age=3600"
            return result

        # Default case: standard pagination
        result = await PokeAPIService.get_pokemon_list(limit, offset)
        if response:
            response.headers["Cache-Control"] = "public, max-age=3600"
        return result

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching pokemon: {e}", exc_info=True)
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail="Uno o más tipos especificados no fueron encontrados.",
            ) from e
        raise HTTPException(
            status_code=500, detail=f"Error de la API externa: {str(e)}"
        ) from e
    except (httpx.TimeoutException, httpx.HTTPError, ValueError) as e:
        logger.error(f"Error fetching pokemon: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error al procesar los filtros: {str(e)}"
        ) from e


@router.get("/random")
async def get_random_pokemon():
    """Obtener todos los detalles de un Pokémon al azar."""
    try:
        return await PokeAPIService.get_random_pokemon()
    except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
        logger.error(f"Error fetching random pokemon: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Error al obtener un Pokémon aleatorio"
        ) from e


@router.get("/game/quiz")
async def get_quiz(
    region: Optional[str] = Query(None, description="Filtrar por región (ej., 'kanto')"),
    type: Optional[str] = Query(None, description="Filtrar por tipo (ej., 'fire')"),
):
    """Generates a quiz optimized to reduce external API calls. Supports optional region and type filters."""
    try:
        return await PokeAPIService.get_optimized_quiz(
            region_name=region,
            type_name=type,
        )
    except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
        logger.error(f"Error generating quiz: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Error generating quiz: {str(e)}"
        ) from e


@router.get("/batch/details")
async def get_batch_details(
    names: List[str] = Query(..., description="Lista de nombres para obtener detalles"),
    response: Response = None,
):
    """Obtener detalles de muchos Pokémon a la vez de forma concurrente."""
    if not names:
        return []

    normalized_names = [str(name).lower() for name in names]
    cache = _cache()
    cached_items = (
        await cache.get_many([_detail_key(name) for name in normalized_names])
        if cache else [None] * len(normalized_names)
    )
    missing_names = [
        name
        for name, item in zip(normalized_names, cached_items, strict=False)
        if item is None
    ]
    tasks = [PokeAPIService.get_pokemon_by_name_or_id(name) for name in missing_names]
    fetched_results = await asyncio.gather(*tasks, return_exceptions=True)
    fetched = [item for item in fetched_results if not isinstance(item, Exception)]
    await _cache_pokemon_details(fetched)

    fetched_by_key = {}
    for item in fetched:
        for identifier in (item.get("original_name"), item.get("name"), item.get("id")):
            if identifier is not None:
                fetched_by_key[str(identifier).lower()] = item

    results = []
    for name, cached_item in zip(normalized_names, cached_items, strict=False):
        item = cached_item or fetched_by_key.get(name)
        if item is not None:
            results.append(item)

    if response:
        response.headers["Cache-Control"] = "public, max-age=3600"
    return results


@router.get("/{name_or_id}")
async def get_pokemon_detail(name_or_id: str, response: Response = None):
    """Obtener todos los detalles de un Pokémon específico por nombre o ID."""
    try:
        cache = _cache()
        if cache:
            cached = await cache.get(_detail_key(name_or_id))
            if cached is not None:
                if response:
                    response.headers["Cache-Control"] = "public, max-age=86400"
                return cached
        result = await PokeAPIService.get_pokemon_by_name_or_id(name_or_id)
        await _cache_pokemon_details([result])
        if response:
            response.headers["Cache-Control"] = "public, max-age=86400"
        return result
    except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
        logger.error(f"Error fetching pokemon detail for {name_or_id}: {e}", exc_info=True)
        raise HTTPException(status_code=404, detail="Pokémon no encontrado") from e
