export interface PokemonSummary {
  name: string;
  id: number;
  image: string;
  types: string[];
}

export interface PokemonDetail extends PokemonSummary {
  stats: {
    base_stat: number;
    name: string;
  }[];
  abilities: string[];
  sprites: {
    front_default: string;
    back_default: string;
    front_shiny: string;
    official_artwork: string;
    dream_world: string;
    home: string;
  };
}

export interface TypeInfo {
  name: string;
}
