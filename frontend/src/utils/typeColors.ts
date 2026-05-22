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
