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
});
