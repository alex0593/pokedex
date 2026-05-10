import httpx
import asyncio
import logging
from typing import List, Dict, Any, Optional
import random
import json

logger = logging.getLogger(__name__)

class PokeAPIService:
    BASE_URL = "https://pokeapi.co/api/v2"
    _client: Optional[httpx.AsyncClient] = None
    _semaphore = asyncio.Semaphore(50) # Virtual 'threads' for concurrent I/O
    




    @classmethod
    async def _get_client(cls) -> httpx.AsyncClient:
        """Returns a singleton httpx client with optimized connection pooling."""
        if cls._client is None or cls._client.is_closed:
            # Reusing connections is MUCH faster than creating new ones
            limits = httpx.Limits(max_keepalive_connections=20, max_connections=100)
            cls._client = httpx.AsyncClient(timeout=15.0, limits=limits)
        return cls._client



    @classmethod
    async def get_generic_batch(cls, endpoint: str, identifiers: List[str]) -> List[Dict[str, Any]]:
        """Fetch multiple details concurrently and transform them."""
        tasks = []
        for ident in identifiers:
            if endpoint == "pokemon":
                tasks.append(cls.get_pokemon_by_name_or_id(ident))
            else:
                tasks.append(cls.get_generic_detail(endpoint, ident))
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        results = []
        for response in responses:
            if isinstance(response, Exception) or response is None:
                continue
            
            # If it was already transformed by get_pokemon_by_name_or_id, skip
            if endpoint == "pokemon":
                results.append(response)
            else:
                results.append(cls.transform_generic(response, endpoint))
        
        return results

    @classmethod
    async def close(cls):
        """Gracefully close the underlying HTTPX client to prevent resource leaks."""
        if cls._client is not None and not cls._client.is_closed:
            await cls._client.aclose()
            cls._client = None

    @classmethod
    async def get_pokemon_list(cls, limit: int = 25, offset: int = 0) -> Dict[str, Any]:
        """Fetch a list of pokemon names and URLs with full-list caching."""

            
        client = await cls._get_client()
        async with cls._semaphore:
            url = f"{cls.BASE_URL}/pokemon?limit={limit}&offset={offset}"
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            return data

    @classmethod
    async def get_random_pokemon(cls) -> Dict[str, Any]:
        """Fetch a random pokemon's details asynchronously."""
        random_id = random.randint(1, 1025)
        return await cls.get_pokemon_by_name_or_id(str(random_id))

    @classmethod
    async def get_pokemon_by_name_or_id(cls, name_or_id: str) -> Dict[str, Any]:
        """Fetch detailed information including species and translations."""
        key = str(name_or_id).lower()
        
        # Para obtener traducciones y flavor text necesitamos los dos endpoints
        # Los ejecutamos en paralelo para no afectar el rendimiento
        pokemon_task = cls._get_raw_pokemon_data(key)
        species_task = cls.get_pokemon_species_data(key)
        
        try:
            pokemon_data, species_data = await asyncio.gather(pokemon_task, species_task)
            return cls._transform_pokemon_data(pokemon_data, species_data)
        except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
            logger.warning(f"Could not fetch species data for {key}: {e}, using pokemon data only")
            pokemon_data = await pokemon_task
            return cls._transform_pokemon_data(pokemon_data)

    @classmethod
    async def _get_raw_pokemon_data(cls, key: str) -> Dict[str, Any]:
        """Helper to get non-transformed data for parallel execution."""
        client = await cls._get_client()
        async with cls._semaphore:
            url = f"{cls.BASE_URL}/pokemon/{key}"
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            return response.json()

    @classmethod
    async def get_pokemon_types(cls) -> List[str]:
        """Fetch all pokemon types, cached indefinitely."""

        
        client = await cls._get_client()
        async with cls._semaphore:
            url = f"{cls.BASE_URL}/type"
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            return [t['name'] for t in data['results']]

    @classmethod
    async def get_pokemon_by_types(cls, type_names: List[str]) -> List[Dict[str, Any]]:
        """Fetch pokemon that belong to ALL specified types (intersection) concurrently."""
        if not type_names:
            return []
        
        client = await cls._get_client()
        async with cls._semaphore:
            tasks = []
            for type_name in type_names:
                url = f"{cls.BASE_URL}/type/{type_name.lower()}"
                tasks.append(client.get(url))
            
            responses = await asyncio.gather(*tasks)
            
            results_per_type = []
            for response in responses:
                response.raise_for_status()
                data = response.json()
                results_per_type.append({p['pokemon']['name']: p['pokemon'] for p in data['pokemon']})
            
        if not results_per_type:
            return []
            
        intersected_names = set(results_per_type[0].keys())
        for type_dict in results_per_type[1:]:
            intersected_names &= set(type_dict.keys())
            
        return [results_per_type[0][name] for name in intersected_names]

    @classmethod
    async def get_pokemon_species_data(cls, name_or_id: str) -> Dict[str, Any]:
        """Fetch pokemon species data for translations and flavor text."""

            
        key = str(name_or_id).lower()
        client = await cls._get_client()
        async with cls._semaphore:
            url = f"{cls.BASE_URL}/pokemon-species/{key}"
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            return data



    @classmethod
    async def get_generic_data(cls, endpoint: str, limit: int = 25, offset: int = 0) -> Dict[str, Any]:
        """Fetch a paginated list of items from a specific PokeAPI endpoint with caching."""


        client = await cls._get_client()
        async with cls._semaphore:
            url = f"{cls.BASE_URL}/{endpoint}?limit={limit}&offset={offset}"
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            return data

    @classmethod
    async def get_generic_detail(cls, endpoint: str, name_or_id: str) -> Dict[str, Any]:
        """Fetch detailed information of a specific item from a PokeAPI endpoint with caching."""


        lookup_id = str(name_or_id).lower()
        client = await cls._get_client()
        async with cls._semaphore:
            url = f"{cls.BASE_URL}/{endpoint}/{lookup_id}"
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            return data

    @classmethod
    async def get_optimized_quiz(cls, region_name: Optional[str] = None, type_name: Optional[str] = None) -> Dict[str, Any]:
        """Generates a quiz efficiently using a single list fetch and smart sampling, with optional region and type filtering."""
        pool = []
        
        # 1. Filter by Region if provided
        if region_name:
            try:
                # Get the pokedex for the given region
                region_data = await cls.get_generic_detail("region", region_name)
                if region_data.get("pokedexes"):
                    first_pokedex_url = region_data["pokedexes"][0]["url"]
                    client = await cls._get_client()
                    res = await client.get(first_pokedex_url, timeout=10.0)
                    if res.status_code == 200:
                        dex_data = res.json()
                        for entry in dex_data.get("pokemon_entries", []):
                            species_name = entry.get("pokemon_species", {}).get("name")
                            if species_name:
                                pool.append({"name": species_name})
            except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
                logger.warning(f"Could not fetch region data for {region_name}: {e}")
                pass
                 
        # 2. Filter by Type if provided (and intersect if Region is also provided)
        if type_name:
            try:
                type_data = await cls.get_generic_detail("type", type_name)
                type_pool = [{"name": p["pokemon"]["name"]} for p in type_data.get("pokemon", [])]
                
                if pool: # Intersect with region pool
                    region_names = {p["name"] for p in pool}
                    pool = [p for p in type_pool if p["name"] in region_names]
                else: # Only type filter
                    pool = type_pool
            except (httpx.HTTPError, httpx.TimeoutException, ValueError) as e:
                logger.warning(f"Could not fetch type data for {type_name}: {e}")
                pass
 
        # 3. Default Pool if no filters applied or if intersection resulted in too few pokemon
        if len(pool) < 4:
            data = await cls.get_pokemon_list(limit=500, offset=random.randint(0, 500))
            pool = data['results']
            
        # Pick 4 random unique pokemon from this pool
        participants = random.sample(pool, 4)
        target_summary = participants[0]
        distractions = [p['name'] for p in participants[1:]]
        
        # Fetch full details for the target only (this is now async and handles translations)
        target = await cls.get_pokemon_by_name_or_id(target_summary['name'])
        
        options = [target['name']] + distractions
        random.shuffle(options)
        
        return {
            "target": target,
            "options": options
        }

    @classmethod
    def _transform_pokemon_data(cls, data: Dict[str, Any], species_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Transform raw data into a clean, English-focused format."""
        main_image = data["sprites"]["other"]["official-artwork"]["front_default"] \
                     or data["sprites"]["front_default"]

        display_name = data["name"].capitalize()
        description = ""
        
        if species_data:
            # Get English flavor text
            for entry in species_data.get("flavor_text_entries", []):
                if entry["language"]["name"] == "en":
                    description = entry["flavor_text"].replace("\f", " ").replace("\n", " ")
                    break

        return {
            "id": data["id"],
            "name": display_name,
            "original_name": data["name"],
            "description": description,
            "height": data["height"],
            "weight": data["weight"],
            "base_experience": data["base_experience"],
            "types": [t["type"]["name"].capitalize() for t in data["types"]],
            "abilities": [a["ability"]["name"] for a in data["abilities"]],
            "image": main_image,
            "stats": [
                {"name": s["stat"]["name"].replace("-", " ").capitalize(), "base_stat": s["base_stat"]}
                for s in data["stats"]
            ],
            "sprites": {
                "front_default": data["sprites"].get("front_default"),
                "back_default": data["sprites"].get("back_default"),
                "front_shiny": data["sprites"].get("front_shiny"),
                "official_artwork": data["sprites"].get("other", {}).get("official-artwork", {}).get("front_default"),
                "dream_world": data["sprites"].get("other", {}).get("dream_world", {}).get("front_default"),
                "home": data["sprites"].get("other", {}).get("home", {}).get("front_default")
            }
        }

    @classmethod
    def transform_generic(cls, data: Dict[str, Any], entity_type: str) -> Dict[str, Any]:
        """Simple English-focused transformer for generic entities."""
        name = data.get("name", "").replace("-", " ").capitalize()
        
        description = ""
        # Try effect_entries first (common for abilities/items)
        for entry in data.get("effect_entries", []):
            if entry.get("language", {}).get("name") == "en":
                description = entry.get("short_effect", entry.get("effect", ""))
                break
        
        # Fallback to flavor_text_entries
        if not description:
            for entry in data.get("flavor_text_entries", []):
                if entry.get("language", {}).get("name") == "en":
                    description = entry.get("flavor_text", "")
                    break

        description = description.replace("\f", " ").replace("\n", " ")

        transformed = {
            "id": data.get("id"),
            "name": name,
            "original_name": data.get("name"),
            "description": description
        }
        
        if entity_type == "move":
            transformed.update({
                "power": data.get("power"),
                "accuracy": data.get("accuracy"),
                "pp": data.get("pp"),
                "type": data.get("type", {}).get("name")
            })
        elif entity_type == "ability":
            transformed.update({
                "is_main_series": data.get("is_main_series"),
                "pokemon": [
                    {
                        "name": p["pokemon"]["name"],
                        "is_hidden": p["is_hidden"]
                    }
                    for p in data.get("pokemon", [])
                ]
            })
        elif entity_type == "item":
            transformed.update({
                "cost": data.get("cost"),
                "category": data.get("category", {}).get("name"),
                "attributes": [attr["name"] for attr in data.get("attributes", [])],
                "image": data.get("sprites", {}).get("default")
            })
        elif entity_type == "berry":
            # Berries don't have descriptions/images in their endpoint, they are in the linked item
            # We construct a heuristic image URL and keep growth data
            transformed.update({
                "growth_time": data.get("growth_time"),
                "max_harvest": data.get("max_harvest"),
                "firmness": data.get("firmness", {}).get("name"),
                "image": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/{data.get('name')}-berry.png"
            })
            
        return transformed



