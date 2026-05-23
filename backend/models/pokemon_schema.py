from typing import List, Optional

from pydantic import BaseModel


class Sprites(BaseModel):
    front_default: Optional[str]
    back_default: Optional[str]
    front_shiny: Optional[str]
    official_artwork: Optional[str]
    dream_world: Optional[str]
    home: Optional[str]

class PokemonBase(BaseModel):
    id: int
    name: str
    types: List[str]
    image: Optional[str]

class PokemonDetail(PokemonBase):
    height: int
    weight: int
    abilities: List[str]
    stats: List[dict]
    base_experience: int
    sprites: Sprites

class PokemonListItem(BaseModel):
    name: str
    url: str
