import { PokemonSummary, PokemonDetail } from '../types/pokemon';
import { apiClient } from '../lib/apiClient';
import { pokemonCache, catalogCache } from '../lib/cache';

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
    const cached = catalogCache.get(cacheKey) as PokemonSummary[] | undefined;
    if (cached) return cached;

    const data = await apiClient<{ results?: PokemonSummary[] }>(`/pokemon/?${cacheKey}`);
    const rawResults = data.results ?? [];

    if (rawResults.length === 0) return [];

    let finalResults: PokemonSummary[] = rawResults;
    if (rawResults.length > 0 && !rawResults[0].image) {
        const names = rawResults.map((p: unknown) => (p as Record<string, unknown>).name as string);
        finalResults = await fetchPokemonBatchDetails(names);
    }

    catalogCache.set(cacheKey, finalResults);
    return finalResults;
}

export async function fetchPokemonDetail(nameOrId: string | number): Promise<PokemonDetail> {
    const cached = pokemonCache.get(nameOrId) as PokemonDetail | undefined;
    if (cached) return cached;

    const data = await apiClient<PokemonDetail>(`/pokemon/${nameOrId}`);
    pokemonCache.set(nameOrId, data);
    pokemonCache.set(data.id, data);
    pokemonCache.set(data.name, data);
    return data;
}

export async function fetchRandomPokemon(): Promise<PokemonDetail> {
    const data = await apiClient<PokemonDetail>('/pokemon/random');
    pokemonCache.set(data.id, data);
    pokemonCache.set(data.name, data);
    return data;
}

export async function fetchTypes(): Promise<string[]> {
    const cached = pokemonCache.get('types') as string[] | undefined;
    if (cached) return cached;

    const data = await apiClient<string[]>('/types/');
    pokemonCache.set('types', data);
    return data;
}

export async function fetchPokemonBatchDetails(names: string[]): Promise<PokemonDetail[]> {
    const query = new URLSearchParams();
    names.forEach(name => query.append('names', name));

    const data = await apiClient<PokemonDetail[]>(`/pokemon/batch/details?${query.toString()}`);
    data.forEach((p: PokemonDetail) => {
        pokemonCache.set(p.id, p);
        pokemonCache.set(p.name, p);
    });
    return data;
}

export async function fetchQuiz(): Promise<{ target: PokemonDetail; options: string[] }> {
    const data = await apiClient<{ target: PokemonDetail; options: string[] }>('/pokemon/game/quiz');
    pokemonCache.set(data.target.id, data.target);
    pokemonCache.set(data.target.name, data.target);
    return data;
}
