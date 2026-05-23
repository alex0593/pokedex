/**
 * Colores canónicos de tipos Pokémon.
 * TYPE_BG_COLORS: extraídos de MoveModal.tsx (badges de tipo rellenos).
 * TYPE_TEXT_COLORS: extraídos de PokemonCard.module.css (selectores data-type="*").
 * Centralizar aquí evita duplicación entre MoveModal, PokemonCard.module.css y pokemon/page.tsx.
 */

export type PokemonType =
  | 'normal' | 'fire' | 'water' | 'grass' | 'electric' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug'
  | 'rock' | 'ghost' | 'dragon' | 'steel' | 'fairy' | 'dark';

/** Color de fondo para badges rellenos (ej: badges en modales de movimientos). */
export const TYPE_BG_COLORS: Record<PokemonType, string> = {
  normal:   '#A8A878',
  fire:     '#F08030',
  water:    '#6890F0',
  grass:    '#78C850',
  electric: '#F8D030',
  ice:      '#98D8D8',
  fighting: '#C03028',
  poison:   '#A040A0',
  ground:   '#E0C068',
  flying:   '#A890F0',
  psychic:  '#F85888',
  bug:      '#A8B820',
  rock:     '#B8A038',
  ghost:    '#705898',
  dragon:   '#7038F8',
  steel:    '#B8B8D0',
  fairy:    '#EE99AC',
  dark:     '#705848',
};

/** Color de texto/borde para chips o badges outline (ej: filtros de tipo, badges en cards). */
export const TYPE_TEXT_COLORS: Record<PokemonType, string> = {
  normal:   '#919aa2',
  fire:     '#ff9d55',
  water:    '#5090d6',
  grass:    '#63bc5a',
  electric: '#f4d23c',
  ice:      '#73cebf',
  fighting: '#ce4069',
  poison:   '#b763cf',
  ground:   '#d97746',
  flying:   '#89aae3',
  psychic:  '#fa7179',
  bug:      '#91c12f',
  rock:     '#c5b679',
  ghost:    '#5269ac',
  dragon:   '#0b6dc3',
  steel:    '#5a8ea1',
  fairy:    '#ec8fe6',
  dark:     '#5a5366',
};

/** Devuelve el color de fondo para un tipo (fallback: Normal). */
export function getTypeBgColor(type: string): string {
  return TYPE_BG_COLORS[type as PokemonType] ?? '#A8A878';
}

/** Devuelve el color de texto/borde para un tipo (fallback: Normal). */
export function getTypeTextColor(type: string): string {
  return TYPE_TEXT_COLORS[type as PokemonType] ?? '#919aa2';
}

/**
 * ID numérico de cada tipo en la PokeAPI.
 * Usado para construir las URLs de los iconos oficiales.
 */
const TYPE_IDS: Record<PokemonType, number> = {
  normal:   1,
  fighting: 2,
  flying:   3,
  poison:   4,
  ground:   5,
  rock:     6,
  bug:      7,
  ghost:    8,
  steel:    9,
  fire:     10,
  water:    11,
  grass:    12,
  electric: 13,
  psychic:  14,
  ice:      15,
  dragon:   16,
  dark:     17,
  fairy:    18,
};

/**
 * Devuelve la URL del icono oficial de tipo (badge pill de Scarlet/Violet).
 * Fuente: repositorio de sprites de PokeAPI en GitHub (ya en remotePatterns y CSP).
 */
export function getTypeIconUrl(type: string): string {
  const id = TYPE_IDS[type as PokemonType];
  if (!id) return '';
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet/${id}.png`;
}
