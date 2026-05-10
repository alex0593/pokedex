import { PokemonSummary, PokemonDetail } from '../types/pokemon';

const BASE_URL = 'http://localhost:8000';

// In-memory cache for the frontend session
const cache = {
    pokemons: new Map<string, PokemonSummary[]>(), // queryKey -> data
    details: new Map<string | number, PokemonDetail>(),
    types: null as string[] | null,
};

export async function fetchPokemons(
    limit: number = 25,
    offset: number = 0,
    search: string = '',
    types: string[] = []
): Promise<PokemonSummary[]> {
    const query = new URLSearchParams();
    query.append('limit', limit.toString());
    query.append('offset', offset.toString());
    if (search.trim()) query.append('search', search.trim());
    types.forEach(type => query.append('types', type));

    const cacheKey = query.toString();
    if (cache.pokemons.has(cacheKey)) return cache.pokemons.get(cacheKey);

    const url = `${BASE_URL}/pokemon/?${cacheKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch pokemons');

    const data = await response.json();
    const rawResults = Array.isArray(data) ? data : (data.results || []);

    if (rawResults.length === 0) return [];

    let finalResults = rawResults;
    if (!rawResults[0].image) {
        const names = rawResults.map((p: unknown) => (p as Record<string, unknown>).name as string);
        finalResults = await fetchPokemonBatchDetails(names);
    }

    cache.pokemons.set(cacheKey, finalResults);
    return finalResults;
}

export async function fetchPokemonDetail(nameOrId: string | number): Promise<PokemonDetail> {
    if (cache.details.has(nameOrId)) return cache.details.get(nameOrId)!;

    const response = await fetch(`${BASE_URL}/pokemon/${nameOrId}`);
    if (!response.ok) throw new Error(`Failed to fetch pokemon: ${nameOrId}`);

    const data = await response.json();
    cache.details.set(nameOrId, data);
    cache.details.set(data.id, data);
    cache.details.set(data.name, data);
    return data;
}

export async function fetchRandomPokemon(): Promise<PokemonDetail> {
    const response = await fetch(`${BASE_URL}/pokemon/random`);
    if (!response.ok) throw new Error('Failed to fetch random pokemon');
    const data = await response.json();

    // Cache the detail we just got
    cache.details.set(data.id, data);
    cache.details.set(data.name, data);
    return data;
}

export async function fetchTypes(): Promise<string[]> {
    if (cache.types) return cache.types;

    const response = await fetch(`${BASE_URL}/types/`);
    if (!response.ok) throw new Error('Failed to fetch types');

    const data = await response.json();
    cache.types = data;
    return data;
}

export async function fetchPokemonBatchDetails(names: string[]): Promise<PokemonDetail[]> {
    // We could check cache for each name, but for simplicity we fetch the batch
    // and then cache each individual result
    const query = new URLSearchParams();
    names.forEach(name => query.append('names', name));

    const response = await fetch(`${BASE_URL}/pokemon/batch/details?${query.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch batch details');

    const data = await response.json();
    data.forEach((p: PokemonDetail) => {
        cache.details.set(p.id, p);
        cache.details.set(p.name, p);
    });
    return data;
}

export async function fetchQuiz(): Promise<{ target: PokemonDetail, options: string[] }> {
    const response = await fetch(`${BASE_URL}/pokemon/game/quiz`);
    if (!response.ok) throw new Error('Failed to fetch quiz');
    const data = await response.json();

    // Cache the target pokemon detail
    cache.details.set(data.target.id, data.target);
    cache.details.set(data.target.name, data.target);

    return data;
}
