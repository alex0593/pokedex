import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendWarmup } from '../../src/components/BackendWarmup';

describe('BackendWarmup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    process.env.NEXT_PUBLIC_BACKEND_URL = 'https://pokedex-backend.onrender.com';
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;
  });

  it('pings the public backend health endpoint once on mount', () => {
    const { unmount } = render(<BackendWarmup />);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      new URL('https://pokedex-backend.onrender.com/health'),
      {
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      },
    );

    unmount();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
    vi.useRealTimers();
  });
});
