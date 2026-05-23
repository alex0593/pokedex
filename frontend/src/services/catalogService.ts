/* eslint-disable @typescript-eslint/no-explicit-any */
// Las respuestas del backend/PokeAPI son estructuras dinámicas que se transforman
// sobre la marcha (añadir/mutar campos como sprites, effect_entries, etc.).
// Usar Record<string, unknown> requeriría casts ubicuos y haría el código ilegible.
// Se desactiva no-explicit-any exclusivamente en este archivo de servicio.
import { ItemDetail, BerryDetail, AbilityDetail, MoveDetail } from '../types/catalog';
import { apiClient } from '../lib/apiClient';
import { catalogCache } from '../lib/cache';

export async function fetchItems(limit: number = 25, offset: number = 0): Promise<ItemDetail[]> {
    const url = `?limit=${limit}&offset=${offset}`;
    const cacheKey = `/items/${url}`;

    const cached = catalogCache.get(cacheKey) as ItemDetail[] | undefined;
    if (cached) return cached;

    const data = await apiClient<any>(`/items/${url}`);
    const rawResults = Array.isArray(data) ? data : (data.results || []);

    const finalResults = await Promise.all(
        rawResults.map(async (item: unknown) => {
            const itemObj = item as Record<string, unknown>;
            if (itemObj.sprites) {
                return item as ItemDetail;
            }
            return await fetchItemDetail(itemObj.name as string);
        })
    );

    catalogCache.set(cacheKey, finalResults);
    return finalResults;
}

export async function fetchItemDetail(name: string): Promise<ItemDetail> {
    const data = await apiClient<any>(`/items/${name}`);

    // Map backend response to frontend format
    if (data.image && (!data.sprites || !data.sprites.default)) {
        if (!data.sprites) data.sprites = {};
        data.sprites.default = data.image;
    }

    if (!data.sprites?.default) {
        if (!data.sprites) data.sprites = {};
        const normalizedName = (data.original_name || data.name || '')
            .toLowerCase()
            .replace(/\s+/g, '-')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '');
        data.sprites.default = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${normalizedName}.png`;
    }

    if (data.description && (!data.effect_entries || data.effect_entries.length === 0)) {
        data.effect_entries = [
            {
                effect: data.description,
                short_effect: data.description,
                language: { name: 'es' },
            },
        ];
    }

    return data;
}

export async function fetchBerries(limit: number = 25, offset: number = 0): Promise<BerryDetail[]> {
    const url = `?limit=${limit}&offset=${offset}`;
    const cacheKey = `/berries/${url}`;

    const cached = catalogCache.get(cacheKey) as BerryDetail[] | undefined;
    if (cached) return cached;

    const data = await apiClient<any>(`/berries/${url}`);
    const rawResults = Array.isArray(data) ? data : (data.results || []);

    const finalResults = await Promise.all(
        rawResults.map(async (berry: unknown) => {
            const berryObj = berry as Record<string, unknown>;
            if (berryObj.firmness) {
                return berry as BerryDetail;
            }
            return await fetchBerryDetail(berryObj.name as string);
        })
    );

    catalogCache.set(cacheKey, finalResults);
    return finalResults;
}

export async function fetchBerryDetail(name: string): Promise<BerryDetail> {
    const data = await apiClient<any>(`/berries/${name}`);

    if (data.image && (!data.sprites || !data.sprites.default)) {
        if (!data.sprites) data.sprites = {};
        data.sprites.default = data.image;
    }

    if (!data.sprites?.default) {
        if (!data.sprites) data.sprites = {};
        const normalizedName = (data.original_name || data.name || '')
            .toLowerCase()
            .replace(/\s+/g, '-')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '');
        data.sprites.default = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${normalizedName}-berry.png`;
    }

    if (data.description && (!data.effect_entries || data.effect_entries.length === 0)) {
        data.effect_entries = [
            {
                effect: data.description,
                short_effect: data.description,
                language: { name: 'es' },
            },
        ];
    }

    if (data.firmness && typeof data.firmness === 'string') {
        data.firmness = { name: data.firmness, url: '' };
    }

    return data;
}

export async function fetchAbilities(limit: number = 25, offset: number = 0): Promise<AbilityDetail[]> {
    const url = `?limit=${limit}&offset=${offset}`;
    const cacheKey = `/abilities/${url}`;

    const cached = catalogCache.get(cacheKey) as AbilityDetail[] | undefined;
    if (cached) return cached;

    const data = await apiClient<any>(`/abilities/${url}`);
    const rawResults = Array.isArray(data) ? data : (data.results || []);

    const finalResults = await Promise.all(
        rawResults.map(async (ability: unknown) => {
            const abilityObj = ability as Record<string, unknown>;
            if (abilityObj.effect_entries && abilityObj.pokemon) {
                return ability as AbilityDetail;
            }
            return await fetchAbilityDetail(abilityObj.name as string);
        })
    );

    catalogCache.set(cacheKey, finalResults);
    return finalResults;
}

export async function fetchAbilityDetail(name: string): Promise<AbilityDetail> {
    const data = await apiClient<any>(`/abilities/${name}`);

    if (data.description && (!data.effect_entries || data.effect_entries.length === 0)) {
        data.effect_entries = [
            {
                effect: data.description,
                short_effect: data.description,
                language: { name: 'es' },
            },
        ];
    }

    if (data.pokemon && Array.isArray(data.pokemon) && data.pokemon.length > 0 && !data.pokemon[0].pokemon) {
        data.pokemon = data.pokemon.map((p: unknown) => {
            const pObj = p as Record<string, unknown>;
            return {
                pokemon: { name: pObj.name as string, url: (pObj.url as string) || '' },
                is_hidden: !!pObj.is_hidden,
            };
        });
    }

    return data;
}

export async function fetchMoves(limit: number = 25, offset: number = 0): Promise<MoveDetail[]> {
    const url = `?limit=${limit}&offset=${offset}`;
    const cacheKey = `/moves/${url}`;

    const cached = catalogCache.get(cacheKey) as MoveDetail[] | undefined;
    if (cached) return cached;

    const data = await apiClient<any>(`/moves/${url}`);
    const rawResults = Array.isArray(data) ? data : (data.results || []);

    const finalResults = await Promise.all(
        rawResults.map(async (move: unknown) => {
            const moveObj = move as Record<string, unknown>;
            if (moveObj.power !== undefined) {
                return move as MoveDetail;
            }
            return await fetchMoveDetail(moveObj.name as string);
        })
    );

    catalogCache.set(cacheKey, finalResults);
    return finalResults;
}

export async function fetchMoveDetail(name: string): Promise<MoveDetail> {
    const data = await apiClient<any>(`/moves/${name}`);

    if (data.description && (!data.effect_entries || data.effect_entries.length === 0)) {
        data.effect_entries = [
            {
                effect: data.description,
                short_effect: data.description,
                language: { name: 'es' },
            },
        ];
    }

    if (data.type && typeof data.type === 'string') {
        data.type = { name: data.type, url: '' };
    }
    if (data.damage_class && typeof data.damage_class === 'string') {
        data.damage_class = { name: data.damage_class, url: '' };
    }

    return data;
}
