import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendWarmup } from '../../src/components/BackendWarmup';

describe('BackendWarmup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;
  });

  it('pings the proxied health endpoint once on mount', () => {
    const { unmount } = render(<BackendWarmup />);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/health', {
      cache: 'no-store',
      signal: expect.any(AbortSignal),
    });

    unmount();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
