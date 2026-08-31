import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTriviaGame } from '../../src/hooks/useTriviaGame';

vi.mock('../../src/services/pokemonService', () => ({
  fetchQuiz: vi.fn().mockResolvedValue({
    target: { id: 25, name: 'Pikachu', original_name: 'pikachu', image: 'url' },
    options: ['Pikachu', 'Raichu', 'Charmander', 'Squirtle'],
  }),
}));

vi.mock('../../src/services/authService', () => ({
    getLoggedUser: vi.fn().mockReturnValue(null),
    getLoggedToken: vi.fn().mockReturnValue(null),
    saveGameResult: vi.fn(),
    saveStageAnswer: vi.fn(),
}));

describe('useTriviaGame', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('should initialize game state', async () => {
    const { result } = renderHook(() => useTriviaGame());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.loading).toBe(false);
    expect(result.current.quiz).toBeTruthy();
    expect(result.current.revealed).toBe(false);
    expect(result.current.score).toBe(0);
  });

  it('should handle correct guess', async () => {
    const { result } = renderHook(() => useTriviaGame());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.handleGuess('Pikachu');
    });

    expect(result.current.revealed).toBe(true);
    expect(result.current.score).toBe(1);
    expect(result.current.message).toContain('Excelente');
  });

  it('should reset score on incorrect guess', async () => {
    const { result } = renderHook(() => useTriviaGame());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.handleGuess('Charmander');
    });

    expect(result.current.revealed).toBe(true);
    expect(result.current.score).toBe(0);
    expect(result.current.message).toContain('Incorrecto');
  });

  it('should persist high score to localStorage', async () => {
    const { result } = renderHook(() => useTriviaGame());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.handleGuess('Pikachu');
    });

    expect(localStorage.getItem('pokeHighScore')).toBe('1');
  });
});
