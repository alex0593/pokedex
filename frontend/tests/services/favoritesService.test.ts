/**
 * tests/services/favoritesService.test.ts
 * Tests unitarios del servicio de favoritos (peticiones HTTP mockeadas).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listFavorites, addFavorite, removeFavorite } from '../../src/services/favoritesService';

const TOKEN = 'test-jwt-token';

describe('favoritesService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('listFavorites calls the correct endpoint with auth header', async () => {
    const mockItems = [
      { id: 1, entity_type: 'pokemon', entity_name: 'pikachu', entity_id: 25 },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => mockItems }),
    );

    const result = await listFavorites(TOKEN);
    expect(result).toEqual(mockItems);
  });

  it('addFavorite posts payload and returns created item', async () => {
    const created = { id: 2, entity_type: 'pokemon', entity_name: 'bulbasaur', entity_id: 1 };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => created }),
    );

    const result = await addFavorite(TOKEN, {
      entity_type: 'pokemon',
      entity_name: 'bulbasaur',
      entity_id: 1,
    });

    expect(result).toEqual(created);
    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const opts = fetchCall[1] as RequestInit;
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body as string)).toMatchObject({ entity_type: 'pokemon', entity_name: 'bulbasaur' });
  });

  it('removeFavorite sends DELETE request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 204 }),
    );

    await removeFavorite(TOKEN, 'pokemon', 'charmander');

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = fetchCall[0] as string;
    const opts = fetchCall[1] as RequestInit;
    expect(url).toContain('/users/favorites/pokemon/charmander');
    expect(opts.method).toBe('DELETE');
  });

  it('addFavorite throws on server error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Internal server error' }),
      }),
    );

    await expect(
      addFavorite(TOKEN, { entity_type: 'item', entity_name: 'poke-ball' }),
    ).rejects.toThrow('Internal server error');
  });
});
