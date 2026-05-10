from fastapi import APIRouter, HTTPException, Query
from services.pokeapi_service import PokeAPIService

router = APIRouter(prefix="/abilities", tags=["Abilities"])

@router.get("/")
async def list_abilities(limit: int = 25, offset: int = 0):
    try:
        return await PokeAPIService.get_generic_data("ability", limit, offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/batch")
async def get_abilities_batch(names: str = Query(..., description="Nombres o IDs separados por coma")):
    try:
        id_list = [id.strip() for id in names.split(",")]
        return await PokeAPIService.get_generic_batch("ability", id_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{name_or_id}")
async def get_ability_detail(name_or_id: str):
    try:
        data = await PokeAPIService.get_generic_detail("ability", name_or_id)
        return PokeAPIService.transform_generic(data, "ability")
    except Exception as e:
        print(f"Error en get_ability_detail para {name_or_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=404, detail="Ability not found")
