export interface ItemSummary {
  name: string;
  url: string;
}

export interface ItemDetail {
  id: number;
  name: string;
  cost: number;
  fling_power: number | null;
  sprites: {
    default: string | null;
  };
  attributes: Array<{ name: string; url: string }>;
  category: { name: string; url: string };
  effect_entries: Array<{ effect: string; short_effect: string; language: { name: string } }>;
}

export interface BerrySummary {
  name: string;
  url: string;
}

export interface BerryDetail {
  id: number;
  name: string;
  growth_time: number;
  max_harvest: number;
  natural_gift_power: number;
  size: number;
  smoothness: number;
  soil_dryness: number;
  firmness: { name: string; url: string };
  flavors: Array<{ flavor: { name: string }, potency: number }>;
  item: { name: string; url: string };
  sprites?: {
    default: string | null;
  };
}

export interface AbilityDetail {
  id: number;
  name: string;
  is_main_series: boolean;
  effect_entries: Array<{ effect: string; short_effect: string; language: { name: string } }>;
  pokemon: Array<{ pokemon: { name: string; url: string }, is_hidden: boolean }>;
}

export interface MoveDetail {
  id: number;
  name: string;
  accuracy: number | null;
  pp: number;
  power: number | null;
  type: { name: string; url: string };
  damage_class: { name: string; url: string };
  effect_entries: Array<{ effect: string; short_effect: string; language: { name: string } }>;
  target: { name: string; url: string };
}

