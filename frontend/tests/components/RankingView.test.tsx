import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RankingView } from '../../src/components/RankingView';
import { fetchRanking } from '../../src/services/authService';

vi.mock('../../src/services/authService', () => ({
  fetchRanking: vi.fn(),
  getLoggedToken: vi.fn(() => 'ranking-token'),
}));

const mockedFetchRanking = vi.mocked(fetchRanking);

describe('RankingView', () => {
  beforeEach(() => mockedFetchRanking.mockReset());

  it('muestra el top y destaca al usuario actual', async () => {
    mockedFetchRanking.mockResolvedValue({
      total_players: 2,
      current_user: {
        position: 2, username: 'misty', points: 7, medals: 0, accuracy: 70, attempts: 1,
      },
      leaders: [
        { position: 1, username: 'ash', points: 9, medals: 1, accuracy: 90, attempts: 1 },
        { position: 2, username: 'misty', points: 7, medals: 0, accuracy: 70, attempts: 1 },
      ],
    });

    render(<RankingView currentUsername="misty" />);

    expect(await screen.findByText('Clasificación global')).toBeVisible();
    expect(screen.getAllByText('ash').length).toBeGreaterThan(0);
    expect(screen.getByText('Tú')).toBeVisible();
    expect(screen.getByText('2 entrenadores · Histórico de Aventura')).toBeVisible();
  });

  it('permite reintentar cuando falla la carga', async () => {
    mockedFetchRanking
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ leaders: [], current_user: null, total_players: 0 });

    render(<RankingView currentUsername={null} />);
    const retry = await screen.findByRole('button', { name: 'Reintentar' });
    fireEvent.click(retry);

    await waitFor(() => expect(mockedFetchRanking).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Aún no hay entrenadores clasificados')).toBeVisible();
  });
});
