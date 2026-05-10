from fastapi import APIRouter, HTTPException, Query
from services.pokeapi_service import PokeAPIService

router = APIRouter(tags=["Evolutions & Breeding"])

@router.get("/evolutions/chain/")
async def list_evolution_chains(limit: int = 25, offset: int = 0):
    try:
        # PokeAPI uses 'evolution-chain' for this endpoint
        return await PokeAPIService.get_generic_data("evolution-chain", limit, offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/evolutions/chain/{id}")
async def get_evolution_chain_detail(id: str):
    try:
        return await PokeAPIService.get_generic_detail("evolution-chain", id)
    except Exception:
        raise HTTPException(status_code=404, detail="Evolution chain not found")

@router.get("/egg-groups/")
async def list_egg_groups(limit: int = 25, offset: int = 0):
    try:
        return await PokeAPIService.get_generic_data("egg-group", limit, offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/egg-groups/{name_or_id}")
async def get_egg_group_detail(name_or_id: str):
    try:
        return await PokeAPIService.get_generic_detail("egg-group", name_or_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Egg group not found")
