from fastapi import APIRouter, HTTPException, Query
from services.pokeapi_service import PokeAPIService

router = APIRouter(prefix="/moves", tags=["Moves"])

@router.get("/")
async def list_moves(limit: int = 25, offset: int = 0):
    try:
        return await PokeAPIService.get_generic_data("move", limit, offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/batch")
async def get_moves_batch(names: str = Query(..., description="Nombres o IDs separados por coma")):
    try:
        id_list = [id.strip() for id in names.split(",")]
        return await PokeAPIService.get_generic_batch("move", id_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{name_or_id}")
async def get_move_detail(name_or_id: str):
    try:
        data = await PokeAPIService.get_generic_detail("move", name_or_id)
        return PokeAPIService.transform_generic(data, "move")
    except Exception as e:
        print(f"Error en get_move_detail para {name_or_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=404, detail="Move not found")
