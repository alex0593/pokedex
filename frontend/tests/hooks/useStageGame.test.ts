import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStageGame } from '../../src/hooks/useTriviaGame';
import { fetchQuiz } from '../../src/services/pokemonService';

vi.mock('../../src/services/pokemonService', () => ({ fetchQuiz: vi.fn() }));
vi.mock('../../src/services/authService', () => ({
  getLoggedToken: vi.fn().mockReturnValue(null),
  saveGameResult: vi.fn(),
  saveStageAnswer: vi.fn(),
}));

const details = (name: string, id: number) => ({
  target: {
    id,
    name: name[0].toUpperCase() + name.slice(1),
    original_name: name,
    image: 'url',
    types: [],
    abilities: [],
    stats: [],
    sprites: {
      front_default: '',
      back_default: '',
      front_shiny: '',
      official_artwork: '',
      dream_world: '',
      home: '',
    },
  },
  options: [name[0].toUpperCase() + name.slice(1), 'A', 'B', 'C'],
});

describe('useStageGame repetition rules', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(fetchQuiz).mockReset();
  });

  it('repeats one failed target after three different questions, then retires it', async () => {
    const newTargets = ['pikachu', 'bulbasaur', 'charmander', 'squirtle', 'eevee'];
    let nextId = 1;
    vi.mocked(fetchQuiz).mockImplementation(async opts => {
      const name = opts?.target ?? newTargets.shift() ?? 'mew';
      return details(name, nextId++);
    });

    const { result } = renderHook(() => useStageGame('kanto', 'fire'));
    await waitFor(() => expect(result.current.questionNumber).toBe(1));

    act(() => result.current.handleGuess('A'));
    await act(async () => result.current.handleNext());

    for (const correctName of ['Bulbasaur', 'Charmander', 'Squirtle']) {
      act(() => result.current.handleGuess(correctName));
      await act(async () => result.current.handleNext());
    }

    expect(result.current.questionNumber).toBe(5);
    expect(result.current.quiz?.target.original_name).toBe('pikachu');
    expect(vi.mocked(fetchQuiz).mock.calls[4][0]).toMatchObject({
      target: 'pikachu',
      exclude: expect.arrayContaining(['pikachu', 'bulbasaur', 'charmander', 'squirtle']),
    });

    act(() => result.current.handleGuess('Pikachu'));
    expect(result.current.correctCount).toBe(4);
    await act(async () => result.current.handleNext());

    expect(vi.mocked(fetchQuiz).mock.calls[5][0]?.target).toBeUndefined();
    expect(result.current.quiz?.target.original_name).toBe('eevee');
  });
});
