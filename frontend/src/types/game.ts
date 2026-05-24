/** Progreso de un stage individual (región + tipo) para un usuario. */
export interface StageProgress {
  region_name: string;
  type_name: string;
  correct_count: number;
  total_count: number;
  attempts: number;
  completed: boolean;
}

/** Estado completo de una región (badge + lista de stages). */
export interface RegionProgress {
  region_name: string;
  badge_earned: boolean;
  stages: StageProgress[];
}

/** Respuesta del backend al registrar una respuesta en un stage. */
export interface StageAnswerResult {
  stage_progress: StageProgress;
  attempt_finished: boolean;
  attempt_passed: boolean;
  attempt_correct_count: number;   // aciertos del intento recién cerrado
  region_completed: boolean;
  new_achievements: string[];
}

/**
 * Mapa canónico de tipos por región — espejo del REGION_STAGES del backend.
 * Usado como fallback en StageSelect cuando el usuario no está autenticado.
 */
export const REGION_STAGES: Record<string, string[]> = {
  kanto:  ['fire', 'water', 'grass', 'psychic', 'ghost', 'dragon'],
  johto:  ['normal', 'fire', 'ice', 'dark', 'steel', 'dragon'],
  hoenn:  ['fire', 'water', 'grass', 'fighting', 'ground', 'flying'],
  sinnoh: ['steel', 'ice', 'ghost', 'dragon', 'fighting', 'psychic'],
  unova:  ['normal', 'fire', 'electric', 'ice', 'dark', 'dragon'],
  kalos:  ['fairy', 'fire', 'psychic', 'flying', 'bug', 'ground'],
  alola:  ['fire', 'water', 'ice', 'electric', 'ghost', 'dragon'],
  galar:  ['ice', 'dark', 'dragon', 'ghost', 'steel', 'fairy'],
  paldea: ['ice', 'dragon', 'psychic', 'ghost', 'steel', 'fire'],
};
