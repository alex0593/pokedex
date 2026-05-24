/* eslint-disable @typescript-eslint/no-explicit-any */
// Las respuestas del backend/PokeAPI son estructuras dinámicas que se transforman
// sobre la marcha (añadir/mutar campos como sprites, effect_entries, etc.).
// Usar Record<string, unknown> requeriría casts ubicuos y haría el código ilegible.
// Se desactiva no-explicit-any exclusivamente en este archivo de servicio.
import { ItemDetail, BerryDetail, AbilityDetail, MoveDetail } from '../types/catalog';
import { apiClient } from '../lib/apiClient';
import { catalogCache } from '../lib/cache';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de normalización — aplican las mismas transformaciones que antes
// hacía fetchXxxDetail() individualmente. Se usan tanto para el batch como para
// el detalle singular (modal).
// ─────────────────────────────────────────────────────────────────────────────

function normalizeBerry(data: any): BerryDetail {
    if (data.image && (!data.sprites || !data.sprites.default)) {
        if (!data.sprites) data.sprites = {};
        data.sprites.default = data.image;
    }
    if (!data.sprites?.default) {
        if (!data.sprites) data.sprites = {};
        const n = (data.original_name || data.name || '')
            .toLowerCase().replace(/\s+/g, '-')
            .normalize('NFD').replace(/[̀-ͯ]/g, '');
        data.sprites.default = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${n}-berry.png`;
    }
    if (data.description && (!data.effect_entries || data.effect_entries.length === 0)) {
        data.effect_entries = [{ effect: data.description, short_effect: data.description, language: { name: 'es' } }];
    }
    if (data.firmness && typeof data.firmness === 'string') {
        data.firmness = { name: data.firmness, url: '' };
    }
    return data as BerryDetail;
}

function normalizeItem(data: any): ItemDetail {
    if (data.image && (!data.sprites || !data.sprites.default)) {
        if (!data.sprites) data.sprites = {};
        data.sprites.default = data.image;
    }
    if (!data.sprites?.default) {
        if (!data.sprites) data.sprites = {};
        const n = (data.original_name || data.name || '')
            .toLowerCase().replace(/\s+/g, '-')
            .normalize('NFD').replace(/[̀-ͯ]/g, '');
        data.sprites.default = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${n}.png`;
    }
    if (data.description && (!data.effect_entries || data.effect_entries.length === 0)) {
        data.effect_entries = [{ effect: data.description, short_effect: data.description, language: { name: 'es' } }];
    }
    return data as ItemDetail;
}

function normalizeAbility(data: any): AbilityDetail {
    if (data.description && (!data.effect_entries || data.effect_entries.length === 0)) {
        data.effect_entries = [{ effect: data.description, short_effect: data.description, language: { name: 'es' } }];
    }
    if (data.pokemon && Array.isArray(data.pokemon) && data.pokemon.length > 0 && !data.pokemon[0].pokemon) {
        data.pokemon = data.pokemon.map((p: any) => ({
            pokemon: { name: p.name as string, url: (p.url as string) || '' },
            is_hidden: !!p.is_hidden,
        }));
    }
    return data as AbilityDetail;
}

function normalizeMove(data: any): MoveDetail {
    if (data.description && (!data.effect_entries || data.effect_entries.length === 0)) {
        data.effect_entries = [{ effect: data.description, short_effect: data.description, language: { name: 'es' } }];
    }
    if (data.type && typeof data.type === 'string') data.type = { name: data.type, url: '' };
    if (data.damage_class && typeof data.damage_class === 'string') data.damage_class = { name: data.damage_class, url: '' };
    return data as MoveDetail;
}

// ─────────────────────────────────────────────────────────────────────────────
// Función genérica: obtiene la lista de stubs y hace UNA sola llamada /batch
// en lugar de N llamadas individuales.
// ─────────────────────────────────────────────────────────────────────────────
async function fetchCatalogBatch<T>(
    entityPath: string,           // "items" | "berries" | "abilities" | "moves"
    limit: number,
    offset: number,
    isDetailCheck: (item: any) => boolean,
    normalize: (item: any) => T,
): Promise<T[]> {
    const cacheKey = `/${entityPath}/?limit=${limit}&offset=${offset}`;
    const cached = catalogCache.get(cacheKey) as T[] | undefined;
    if (cached) return cached;

    // 1. Lista paginada (stubs: {name, url})
    const listData = await apiClient<any>(`/${entityPath}/?limit=${limit}&offset=${offset}`);
    const stubs: any[] = Array.isArray(listData) ? listData : (listData.results || []);

    let results: T[];

    if (stubs.length === 0) {
        results = [];
    } else if (isDetailCheck(stubs[0])) {
        // El endpoint ya devuelve detalle completo — normalizar directamente
        results = stubs.map(normalize);
    } else {
        // Stubs sin detalle → una sola llamada /batch con todos los nombres
        const names = stubs.map((s: any) => (s.original_name ?? s.name) as string).join(',');
        const batchData = await apiClient<any[]>(`/${entityPath}/batch?names=${encodeURIComponent(names)}`);
        results = (batchData ?? []).map(normalize);
    }

    catalogCache.set(cacheKey, results);
    return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchItems(limit = 25, offset = 0): Promise<ItemDetail[]> {
    return fetchCatalogBatch(
        'items', limit, offset,
        (item) => !!item.sprites,
        normalizeItem,
    );
}

export async function fetchItemDetail(name: string): Promise<ItemDetail> {
    const data = await apiClient<any>(`/items/${name}`);
    return normalizeItem(data);
}

export async function fetchBerries(limit = 25, offset = 0): Promise<BerryDetail[]> {
    return fetchCatalogBatch(
        'berries', limit, offset,
        (item) => item.firmness !== undefined,
        normalizeBerry,
    );
}

export async function fetchBerryDetail(name: string): Promise<BerryDetail> {
    const data = await apiClient<any>(`/berries/${name}`);
    return normalizeBerry(data);
}

export async function fetchAbilities(limit = 25, offset = 0): Promise<AbilityDetail[]> {
    return fetchCatalogBatch(
        'abilities', limit, offset,
        (item) => !!(item.effect_entries && item.pokemon),
        normalizeAbility,
    );
}

export async function fetchAbilityDetail(name: string): Promise<AbilityDetail> {
    const data = await apiClient<any>(`/abilities/${name}`);
    return normalizeAbility(data);
}

export async function fetchMoves(limit = 25, offset = 0): Promise<MoveDetail[]> {
    return fetchCatalogBatch(
        'moves', limit, offset,
        (item) => item.power !== undefined,
        normalizeMove,
    );
}

export async function fetchMoveDetail(name: string): Promise<MoveDetail> {
    const data = await apiClient<any>(`/moves/${name}`);
    return normalizeMove(data);
}
