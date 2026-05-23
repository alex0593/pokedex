from fastapi import APIRouter, HTTPException

from services.pokeapi_service import PokeAPIService

router = APIRouter(prefix="/types", tags=["Tipos"])


@router.get("/")
async def list_all_types():
    """Obtener todos los tipos de Pokémon de PokeAPI."""
    try:
        return await PokeAPIService.get_pokemon_types()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/{type_name}")
async def get_pokemon_by_type(type_name: str):
    """Obtener una lista de nombres y URLs de Pokémon filtrados por tipo."""
    try:
        return await PokeAPIService.get_pokemon_by_types([type_name])
    except Exception as e:
        raise HTTPException(status_code=404, detail="Tipo no encontrado") from e
