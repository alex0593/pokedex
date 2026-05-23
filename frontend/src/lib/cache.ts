export class Cache<K, V> {
    private store: Map<K, V> = new Map();

    has(key: K): boolean {
        return this.store.has(key);
    }

    get(key: K): V | undefined {
        return this.store.get(key);
    }

    set(key: K, value: V): void {
        this.store.set(key, value);
    }

    clear(): void {
        this.store.clear();
    }

    delete(key: K): boolean {
        return this.store.delete(key);
    }

    size(): number {
        return this.store.size;
    }
}

// Singleton instances for each entity type
export const pokemonCache = new Cache<string | number, unknown>();
export const catalogCache = new Cache<string, unknown[]>();
