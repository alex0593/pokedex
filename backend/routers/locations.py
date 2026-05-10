from fastapi import APIRouter, HTTPException, Query
from services.pokeapi_service import PokeAPIService
import os
import json
import httpx
import asyncio

router = APIRouter(tags=["Locations & Regions"])

# Cargar la metadata local (Gestor de metadatos)
METADATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "region_metadata.json")
_cached_metadata = None


def load_region_metadata():
    global _cached_metadata
    if _cached_metadata is None:
        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                _cached_metadata = json.load(f)
        else:
            _cached_metadata = {}
    return _cached_metadata

@router.get("/locations/")
async def list_locations(limit: int = 25, offset: int = 0):
    try:
        return await PokeAPIService.get_generic_data("location", limit, offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/locations/{name_or_id}")
async def get_location_detail(name_or_id: str):
    try:
        return await PokeAPIService.get_generic_detail("location", name_or_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Location not found")

@router.get("/locations/{name_or_id}/encounters")
async def get_location_encounters(name_or_id: str):
    """
    Trae todos los Pokémon que aparecen en una ubicación sumando los de cada una de sus "areas".
    """
    lookup_key = str(name_or_id).lower()
    try:
        location_data = await PokeAPIService.get_generic_detail("location", lookup_key)
        areas = location_data.get("areas", [])
        
        if not areas:
            return []
            
        async with httpx.AsyncClient(timeout=15.0) as client:
            tasks = []
            # Obtener datos de cada area
            for area in areas:
                tasks.append(client.get(area["url"]))
            
            # return_exceptions=True prevents one failed area request from crashing the whole gather
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            all_encounters = {}
            for res in responses:
                if isinstance(res, Exception) or res.status_code != 200:
                    continue # Skip failed requests gracefully
                
                area_data = res.json()
                for encounter in area_data.get("pokemon_encounters", []):
                    pokemon_name = encounter["pokemon"]["name"]
                    if pokemon_name not in all_encounters:
                        all_encounters[pokemon_name] = {
                            "pokemon": encounter["pokemon"],
                            "methods": []
                        }
                    
                    # Extraer métodos resumidos para no saturar la respuesta
                    for v in encounter["version_details"]:
                        for details in v["encounter_details"]:
                            method = details["method"]["name"]
                            if method not in all_encounters[pokemon_name]["methods"]:
                                all_encounters[pokemon_name]["methods"].append(method)

        # Formatear la respuesta como una lista plana
        result = [
            {
                "name": v["pokemon"]["name"],
                "url": v["pokemon"]["url"],
                "encounter_methods": v["methods"]
            }
            for k, v in all_encounters.items()
        ]
        
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching encounters: {str(e)}")


@router.get("/regions/")
async def list_regions(limit: int = 25, offset: int = 0):
    try:
        return await PokeAPIService.get_generic_data("region", limit, offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/regions/{name_or_id}")
async def get_region_detail(name_or_id: str):
    try:
        # 1. Obtener la region base desde la PokeAPI
        region_data = await PokeAPIService.get_generic_detail("region", name_or_id)
        
        # 2. Leer nuestro gestor de metadatos local
        local_meta = load_region_metadata()
        
        region_id_str = str(region_data["id"])
        
        # 3. Inyectar datos si existen
        if region_id_str in local_meta:
            region_data["map_image"] = local_meta[region_id_str].get("map_image")
            region_data["interactive_points"] = local_meta[region_id_str].get("locations", [])
        else:
            region_data["map_image"] = None
            region_data["interactive_points"] = []
            
        return region_data

    except Exception:
        raise HTTPException(status_code=404, detail="Region not found")

@router.get("/regions/{name_or_id}/pokemon")
async def get_region_pokemon(name_or_id: str):
    try:
        # 1. Obtener la región de PokeAPI
        region_data = await PokeAPIService.get_generic_detail("region", name_or_id)
        
        # 2. Obtener mapa local si existe
        local_meta = load_region_metadata()
        region_id_str = str(region_data.get("id", ""))
        map_image = None
        if region_id_str in local_meta:
            map_image = local_meta[region_id_str].get("map_image")
            
        # 3. Extraer Pokémon de la pokedex de esta región
        pokemon_list = []
        pokedexes = region_data.get("pokedexes", [])
        
        if pokedexes:
            # Tomamos la primera pokedex como principal de la región
            first_pokedex_url = pokedexes[0]["url"]
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(first_pokedex_url)
                if res.status_code == 200:
                    dex_data = res.json()
                    for entry in dex_data.get("pokemon_entries", []):
                        species = entry.get("pokemon_species", {})
                        if species:
                            pokemon_list.append({
                                "name": species.get("name"),
                                "url": species.get("url")
                            })
                            
        return {
            "region_id": region_data.get("id"),
            "region_name": region_data.get("name"),
            "map_image": map_image,
            "pokemon": pokemon_list
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching region pokemon: {str(e)}")
