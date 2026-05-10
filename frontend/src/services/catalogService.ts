import { ItemDetail, BerryDetail, AbilityDetail, MoveDetail } from '../types/catalog';

const BASE_URL = 'http://localhost:8000';

// In-memory cache for the frontend session
const cache = {
    items: new Map<string, ItemDetail>(),
    berries: new Map<string, BerryDetail>(),
    abilities: new Map<string, AbilityDetail>(),
    moves: new Map<string, MoveDetail>(),
    lists: new Map<string, any[]>(), // url -> results
};

export async function fetchItems(limit: number = 25, offset: number = 0): Promise<ItemDetail[]> {
    const url = `${BASE_URL}/items/?limit=${limit}&offset=${offset}`;
    if (cache.lists.has(url)) return cache.lists.get(url) as ItemDetail[];

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch items');
    
    const data = await response.json();
    const rawResults = Array.isArray(data) ? data : (data.results || []);
    
    const finalResults = await Promise.all(
        rawResults.map(async (item: any) => {
            if (item.sprites) {
                cache.items.set(item.name, item);
                return item as ItemDetail;
            }
            return await fetchItemDetail(item.name);
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
        rawResults.map(async (berry: any) => {
            if (berry.firmness) {
                cache.berries.set(berry.name, berry);
                return berry as BerryDetail;
            }
            return await fetchBerryDetail(berry.name);
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
        rawResults.map(async (ability: any) => {
            if (ability.effect_entries && ability.pokemon) {
                cache.abilities.set(ability.name, ability);
                return ability as AbilityDetail;
            }
            return await fetchAbilityDetail(ability.name);
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
        data.pokemon = data.pokemon.map((p: any) => ({
            pokemon: { name: p.name, url: p.url || '' },
            is_hidden: !!p.is_hidden
        }));
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
        rawResults.map(async (move: any) => {
            if (move.power !== undefined) {
                cache.moves.set(move.name, move);
                return move as MoveDetail;
            }
            return await fetchMoveDetail(move.name);
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

