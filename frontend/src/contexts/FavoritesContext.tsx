"use client";

/**
 * FavoritesContext — Estado global de favoritos.
 *
 * - Al iniciar sesión, carga los favoritos del backend.
 * - `toggle` aplica una actualización optimista (cambia el estado local
 *   inmediatamente) y sincroniza con el servidor en segundo plano.
 * - Si el servidor falla, el estado local se revierte.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import {
  addFavorite,
  EntityType,
  FavoriteItem,
  listFavorites,
  removeFavorite,
} from '../services/favoritesService';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface FavoritesContextValue {
  /** Set de claves "type:name", e.g. "pokemon:pikachu". */
  favorites: Set<string>;
  /** Lista completa (útil para la página /favorites). */
  favoritesList: FavoriteItem[];
  isLoading: boolean;
  isFavorite: (type: EntityType, name: string) => boolean;
  toggle: (type: EntityType, name: string, entityId?: number | null) => Promise<void>;
}

// ── Contexto ──────────────────────────────────────────────────────────────────

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

function favoriteKey(type: EntityType, name: string): string {
  return `${type}:${name}`;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('poke_token');
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [favoritesList, setFavoritesList] = useState<FavoriteItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Carga los favoritos del backend cuando el usuario inicia sesión
  useEffect(() => {
    if (!user) {
      setFavorites(new Set()); // eslint-disable-line react-hooks/set-state-in-effect
      setFavoritesList([]);
      return;
    }

    const token = getToken();
    if (!token) return;

    setIsLoading(true);
    listFavorites(token)
      .then((items) => {
        setFavoritesList(items);
        setFavorites(new Set(items.map((f) => favoriteKey(f.entity_type, f.entity_name))));
      })
      .catch(() => {
        // Fallo silencioso — los favoritos no son críticos
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const isFavorite = useCallback(
    (type: EntityType, name: string) => favorites.has(favoriteKey(type, name)),
    [favorites],
  );

  const toggle = useCallback(
    async (type: EntityType, name: string, entityId?: number | null) => {
      const token = getToken();
      if (!token) return;

      const key = favoriteKey(type, name);
      const alreadyFav = favorites.has(key);

      // Actualización optimista
      if (alreadyFav) {
        setFavorites((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        setFavoritesList((prev) => prev.filter((f) => favoriteKey(f.entity_type, f.entity_name) !== key));
      } else {
        const optimisticItem: FavoriteItem = {
          id: Date.now(), // ID temporal
          entity_type: type,
          entity_name: name,
          entity_id: entityId ?? null,
        };
        setFavorites((prev) => new Set([...prev, key]));
        setFavoritesList((prev) => [...prev, optimisticItem]);
      }

      // Sincronización con el servidor
      try {
        if (alreadyFav) {
          await removeFavorite(token, type, name);
        } else {
          const saved = await addFavorite(token, { entity_type: type, entity_name: name, entity_id: entityId });
          // Reemplazar el item optimista con el real (tiene ID correcto)
          setFavoritesList((prev) =>
            prev.map((f) =>
              favoriteKey(f.entity_type, f.entity_name) === key && f.id >= Date.now() - 5000
                ? saved
                : f,
            ),
          );
        }
      } catch {
        // Revertir en caso de error
        if (alreadyFav) {
          setFavorites((prev) => new Set([...prev, key]));
          // Recargar lista completa para recuperar el item
          listFavorites(token)
            .then((items) => {
              setFavoritesList(items);
              setFavorites(new Set(items.map((f) => favoriteKey(f.entity_type, f.entity_name))));
            })
            .catch(() => {});
        } else {
          setFavorites((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          setFavoritesList((prev) =>
            prev.filter((f) => favoriteKey(f.entity_type, f.entity_name) !== key),
          );
        }
      }
    },
    [favorites],
  );

  return (
    <FavoritesContext.Provider value={{ favorites, favoritesList, isLoading, isFavorite, toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
