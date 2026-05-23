/**
 * favoritesService.ts — CRUD de favoritos contra el backend.
 * Todos los endpoints requieren JWT (Bearer token).
 */
import { apiClient } from '../lib/apiClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type EntityType = 'pokemon' | 'item' | 'berry' | 'ability' | 'move';

export interface FavoriteItem {
  id: number;
  entity_type: EntityType;
  entity_id?: number | null;
  entity_name: string;
}

export interface FavoriteCreate {
  entity_type: EntityType;
  entity_name: string;
  entity_id?: number | null;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Obtiene todos los favoritos del usuario (opcionalmente filtrados por tipo). */
export async function listFavorites(
  token: string,
  entityType?: EntityType,
): Promise<FavoriteItem[]> {
  const qs = entityType ? `?entity_type=${entityType}` : '';
  return apiClient<FavoriteItem[]>(`/users/favorites/${qs}`, {
    headers: authHeaders(token),
  });
}

/** Añade una entidad a favoritos. Idempotente. */
export async function addFavorite(
  token: string,
  payload: FavoriteCreate,
): Promise<FavoriteItem> {
  const response = await fetch(`${API_URL}/users/favorites/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: `Error ${response.status}` }));
    throw new Error(err.detail || 'Error al añadir favorito');
  }
  return response.json();
}

/** Elimina un favorito. Devuelve true si se eliminó, lanza error si no existe. */
export async function removeFavorite(
  token: string,
  entityType: EntityType,
  entityName: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/users/favorites/${entityType}/${entityName}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
  if (!response.ok && response.status !== 204) {
    const err = await response.json().catch(() => ({ detail: `Error ${response.status}` }));
    throw new Error(err.detail || 'Error al eliminar favorito');
  }
}
