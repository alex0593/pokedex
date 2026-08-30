import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Cache } from '../../src/lib/cache';

describe('Cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('expires entries after the configured TTL', () => {
    const cache = new Cache<string, number>(1000, 10);
    cache.set('key', 1);
    vi.setSystemTime(1001);

    expect(cache.get('key')).toBeUndefined();
  });

  it('evicts the least recently used entry at the size limit', () => {
    const cache = new Cache<string, number>(1000, 2);
    cache.set('first', 1);
    cache.set('second', 2);
    cache.get('first');
    cache.set('third', 3);

    expect(cache.get('first')).toBe(1);
    expect(cache.get('second')).toBeUndefined();
    expect(cache.get('third')).toBe(3);
  });
});
