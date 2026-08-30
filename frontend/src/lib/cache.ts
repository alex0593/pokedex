export class Cache<K, V> {
    private store: Map<K, { value: V; expiresAt: number }> = new Map();

    constructor(
        private readonly ttlMs: number = 60 * 60 * 1000,
        private readonly maxEntries: number = 500,
    ) {}

    has(key: K): boolean {
        return this.get(key) !== undefined;
    }

    get(key: K): V | undefined {
        const entry = this.store.get(key);
        if (!entry) return undefined;
        if (entry.expiresAt <= Date.now()) {
            this.store.delete(key);
            return undefined;
        }
        // Reinserting promotes the entry to most recently used.
        this.store.delete(key);
        this.store.set(key, entry);
        return entry.value;
    }

    set(key: K, value: V): void {
        this.store.delete(key);
        this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
        while (this.store.size > this.maxEntries) {
            const oldestKey = this.store.keys().next().value as K | undefined;
            if (oldestKey === undefined) break;
            this.store.delete(oldestKey);
        }
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
export const pokemonCache = new Cache<string | number, unknown>(24 * 60 * 60 * 1000, 500);
export const catalogCache = new Cache<string, unknown[]>(60 * 60 * 1000, 200);
