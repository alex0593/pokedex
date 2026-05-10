import { ItemDetail, BerryDetail, AbilityDetail, MoveDetail } from '../types/catalog';

const BASE_URL = 'http://localhost:8000';

// In-memory cache for the frontend session
const cache = {
    items: new Map<string, ItemDetail>(),
    berries: new Map<string, BerryDetail>(),
    abilities: new Map<string, AbilityDetail>(),
    moves: new Map<string, MoveDetail>(),
    lists: new Map<string, (ItemDetail | BerryDetail | AbilityDetail | MoveDetail)[]>(), // url -> results
};

export async function fetchItems(limit: number = 25, offset: number = 0): Promise<ItemDetail[]> {
    const url = `${BASE_URL}/items/?limit=${limit}&offset=${offset}`;
    if (cache.lists.has(url)) return cache.lists.get(url) as ItemDetail[];

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch items');
    
    const data = await response.json();
    const rawResults = Array.isArray(data) ? data : (data.results || []);
    
    const finalResults = await Promise.all(
        rawResults.map(async (item: unknown) => {
            const itemObj = item as Record<string, unknown>;
            if (itemObj.sprites) {
                const detail = item as ItemDetail;
                cache.items.set(detail.name, detail);
                return detail;
            }
            return await fetchItemDetail(itemObj.name as string);
        })
    );
    
    cache.lists.set(url, finalResults);
    return finalResults;
}

export async function fetchItemDetail(name: string): Promise<ItemDetail> {
    if (cache.items.has(name)) return cache.items.get(name)!;

    const response = await fetch(`${BASE_URL}/items/${name}`);
    if (!response.ok) throw new Error(`Failed to fetch item details for ${name}`);
    const data = await response.json();

    // Map backend response (v2.1.0) to frontend expected format
    if (data.image && (!data.sprites || !data.sprites.default)) {
        if (!data.sprites) data.sprites = {};
        data.sprites.default = data.image;
    }
    
    // Robust fallback to PokeAPI GitHub repo using lowercase name
    if (!data.sprites?.default) {
        if (!data.sprites) data.sprites = {};
        const normalizedName = (data.original_name || data.name || '').toLowerCase()
            .replace(/\s+/g, '-')
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        data.sprites.default = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${normalizedName}.png`;
    }

    if (data.description && (!data.effect_entries || data.effect_entries.length === 0)) {
        data.effect_entries = [
            {
                effect: data.description,
                short_effect: data.description,
                language: { name: 'es' }
            }
        ];
    }

    cache.items.set(name, data);
    return data;
}

export async function fetchBerries(limit: number = 25, offset: number = 0): Promise<BerryDetail[]> {
    const url = `${BASE_URL}/berries/?limit=${limit}&offset=${offset}`;
    if (cache.lists.has(url)) return cache.lists.get(url) as BerryDetail[];

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch berries');
    const data = await response.json();
    const rawResults = Array.isArray(data) ? data : (data.results || []);
    
    const finalResults = await Promise.all(
        rawResults.map(async (berry: unknown) => {
            const berryObj = berry as Record<string, unknown>;
            if (berryObj.firmness) {
                const detail = berry as BerryDetail;
                cache.berries.set(detail.name, detail);
                return detail;
            }
            return await fetchBerryDetail(berryObj.name as string);
        })
    );
    
    cache.lists.set(url, finalResults);
    return finalResults;
}

export async function fetchBerryDetail(name: string): Promise<BerryDetail> {
    if (cache.berries.has(name)) return cache.berries.get(name)!;

    const response = await fetch(`${BASE_URL}/berries/${name}`);
    if (!response.ok) throw new Error(`Failed to fetch berry details for ${name}`);
    const data = await response.json();
    
    // Map backend response (v2.1.0) to frontend expected format
    if (data.image && (!data.sprites || !data.sprites.default)) {
        if (!data.sprites) data.sprites = {};
        data.sprites.default = data.image;
    }
    
    // Robust fallback to PokeAPI GitHub repo using lowercase name
    if (!data.sprites?.default) {
        if (!data.sprites) data.sprites = {};
        const normalizedName = (data.original_name || data.name || '').toLowerCase()
            .replace(/\s+/g, '-')
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        data.sprites.default = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${normalizedName}-berry.png`;
    }

    if (data.description && (!data.effect_entries || data.effect_entries.length === 0)) {
        data.effect_entries = [
            {
                effect: data.description,
                short_effect: data.description,
                language: { name: 'es' }
            }
        ];
    }
    
    // Fallback for firmness if it's just a string
    if (data.firmness && typeof data.firmness === 'string') {
        data.firmness = { name: data.firmness, url: '' };
    }
    
    cache.berries.set(name, data);
    return data;
}

export async function fetchAbilities(limit: number = 25, offset: number = 0): Promise<AbilityDetail[]> {
    const url = `${BASE_URL}/abilities/?limit=${limit}&offset=${offset}`;
    if (cache.lists.has(url)) return cache.lists.get(url) as AbilityDetail[];

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch abilities');
    const data = await response.json();
    const rawResults = Array.isArray(data) ? data : (data.results || []);
    
    const finalResults = await Promise.all(
        rawResults.map(async (ability: unknown) => {
            const abilityObj = ability as Record<string, unknown>;
            if (abilityObj.effect_entries && abilityObj.pokemon) {
                const detail = ability as AbilityDetail;
                cache.abilities.set(detail.name, detail);
                return detail;
            }
            return await fetchAbilityDetail(abilityObj.name as string);
        })
    );
    
    cache.lists.set(url, finalResults);
    return finalResults;
}

export async function fetchAbilityDetail(name: string): Promise<AbilityDetail> {
    if (cache.abilities.has(name)) return cache.abilities.get(name)!;

    const response = await fetch(`${BASE_URL}/abilities/${name}`);
    if (!response.ok) throw new Error(`Failed to fetch ability details for ${name}`);
    const data = await response.json();
    
    // Map backend response (v2.1.0) to frontend expected format
    if (data.description && (!data.effect_entries || data.effect_entries.length === 0)) {
        data.effect_entries = [
            {
                effect: data.description,
                short_effect: data.description,
                language: { name: 'es' }
            }
        ];
    }

    // Map simple pokemon list to the expected structure
    if (data.pokemon && Array.isArray(data.pokemon) && data.pokemon.length > 0 && !data.pokemon[0].pokemon) {
        data.pokemon = data.pokemon.map((p: unknown) => {
            const pObj = p as Record<string, unknown>;
            return {
                pokemon: { name: pObj.name as string, url: (pObj.url as string) || '' },
                is_hidden: !!pObj.is_hidden
            };
        });
    }
    
    cache.abilities.set(name, data);
    return data;
}

export async function fetchMoves(limit: number = 25, offset: number = 0): Promise<MoveDetail[]> {
    const url = `${BASE_URL}/moves/?limit=${limit}&offset=${offset}`;
    if (cache.lists.has(url)) return cache.lists.get(url) as MoveDetail[];

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch moves');
    const data = await response.json();
    const rawResults = Array.isArray(data) ? data : (data.results || []);
    
    const finalResults = await Promise.all(
        rawResults.map(async (move: unknown) => {
            const moveObj = move as Record<string, unknown>;
            if (moveObj.power !== undefined) {
                const detail = move as MoveDetail;
                cache.moves.set(detail.name, detail);
                return detail;
            }
            return await fetchMoveDetail(moveObj.name as string);
        })
    );
    
    cache.lists.set(url, finalResults);
    return finalResults;
}

export async function fetchMoveDetail(name: string): Promise<MoveDetail> {
    if (cache.moves.has(name)) return cache.moves.get(name)!;

    const response = await fetch(`${BASE_URL}/moves/${name}`);
    if (!response.ok) throw new Error(`Failed to fetch move details for ${name}`);
    const data = await response.json();
    
    // Map backend response (v2.1.0) to frontend expected format
    if (data.description && (!data.effect_entries || data.effect_entries.length === 0)) {
        data.effect_entries = [
            {
                effect: data.description,
                short_effect: data.description,
                language: { name: 'es' }
            }
        ];
    }
    
    // Fallbacks for type and damage_class if they are just strings
    if (data.type && typeof data.type === 'string') {
        data.type = { name: data.type, url: '' };
    }
    if (data.damage_class && typeof data.damage_class === 'string') {
        data.damage_class = { name: data.damage_class, url: '' };
    }
    
    cache.moves.set(name, data);
    return data;
}

