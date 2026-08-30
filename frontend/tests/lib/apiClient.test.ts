import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '../../src/lib/apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should make a GET request', async () => {
    const mockResponse = { id: 1, name: 'Pikachu' };
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as unknown as Response);

    const result = await apiClient('/pokemon/pikachu');
    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/pokemon/pikachu'),
      expect.any(Object)
    );
  });

  it('should handle timeout', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Timeout'));

    await expect(apiClient('/pokemon/test')).rejects.toThrow();
  });

  it('should retry on 5xx errors', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 1 }),
      } as unknown as Response);

    const result = await apiClient('/pokemon/test', { retries: 2 });
    expect(result).toEqual({ id: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should not retry on 4xx errors', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Not found' }),
    } as unknown as Response);

    await expect(apiClient('/pokemon/nonexistent')).rejects.toThrow();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent identical GET requests', async () => {
    let resolveRequest!: (value: Response) => void;
    global.fetch = vi.fn().mockReturnValueOnce(
      new Promise<Response>((resolve) => { resolveRequest = resolve; }),
    );

    const first = apiClient('/pokemon/pikachu');
    const second = apiClient('/pokemon/pikachu');
    resolveRequest({
      ok: true,
      status: 200,
      json: async () => ({ id: 25 }),
    } as Response);

    await expect(Promise.all([first, second])).resolves.toEqual([{ id: 25 }, { id: 25 }]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not deduplicate mutation requests', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);

    await Promise.all([
      apiClient('/favorites', { method: 'POST', body: { id: 1 } }),
      apiClient('/favorites', { method: 'POST', body: { id: 1 } }),
    ]);

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
