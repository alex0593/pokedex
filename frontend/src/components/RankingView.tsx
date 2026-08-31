'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchRanking, getLoggedToken } from '../services/authService';
import type { RankingEntry, RankingResponse } from '../types/game';
import styles from './RankingView.module.css';

interface RankingViewProps {
  currentUsername: string | null;
}

const PODIUM_ICONS = ['🥇', '🥈', '🥉'];

function PlayerAvatar({ player }: { player: RankingEntry }) {
  if (player.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL de avatar elegida por el usuario
      <img className={styles.avatar} src={player.avatar_url} alt="" />
    );
  }
  return <span className={styles.avatarFallback}>{player.username.slice(0, 1).toUpperCase()}</span>;
}

function RankingRow({ player, isCurrent }: { player: RankingEntry; isCurrent: boolean }) {
  return (
    <div className={`${styles.row} ${isCurrent ? styles.currentRow : ''}`}>
      <strong className={styles.position}>#{player.position}</strong>
      <div className={styles.player}>
        <PlayerAvatar player={player} />
        <span>{player.username}</span>
        {isCurrent && <span className={styles.youBadge}>Tú</span>}
      </div>
      <strong className={styles.points}>{player.points}</strong>
      <span>{player.medals} 🏅</span>
      <span>{player.accuracy.toFixed(1)}%</span>
      <span>{player.attempts}</span>
    </div>
  );
}

export function RankingView({ currentUsername }: RankingViewProps) {
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRanking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRanking(await fetchRanking(getLoggedToken()));
    } catch {
      setError('No se pudo cargar la clasificación. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRanking();
  }, [loadRanking]);

  if (loading) return <div className={styles.state}>Cargando clasificación…</div>;
  if (error) {
    return (
      <div className={styles.state} role="alert">
        <p>{error}</p>
        <button className={styles.retryButton} type="button" onClick={loadRanking}>Reintentar</button>
      </div>
    );
  }
  if (!ranking || ranking.leaders.length === 0) {
    return (
      <div className={styles.state}>
        <span className={styles.emptyIcon}>🏁</span>
        <h2>Aún no hay entrenadores clasificados</h2>
        <p>Completa un intento de Aventura para inaugurar el ranking.</p>
      </div>
    );
  }

  const podium = ranking.leaders.slice(0, 3);
  const personalOutsideTop = ranking.current_user
    && !ranking.leaders.some(player => player.username === ranking.current_user?.username)
    ? ranking.current_user
    : null;

  return (
    <section className={styles.container} aria-labelledby="ranking-title">
      <header className={styles.header}>
        <span className={styles.trophy}>🏆</span>
        <div>
          <h2 id="ranking-title">Clasificación global</h2>
          <p>{ranking.total_players} entrenadores · Histórico de Aventura</p>
        </div>
      </header>

      <div className={styles.podium}>
        {podium.map((player, index) => (
          <article
            className={`${styles.podiumCard} ${index === 0 ? styles.champion : ''}`}
            key={player.username}
          >
            <span className={styles.medal}>{PODIUM_ICONS[index]}</span>
            <PlayerAvatar player={player} />
            <strong>{player.username}</strong>
            <span className={styles.podiumPoints}>{player.points} puntos</span>
            <small>{player.medals} medallas · {player.accuracy.toFixed(1)}%</small>
          </article>
        ))}
      </div>

      {personalOutsideTop && (
        <div className={styles.personalSection}>
          <span>Tu posición</span>
          <RankingRow player={personalOutsideTop} isCurrent />
        </div>
      )}

      <div className={styles.table} role="table" aria-label="Ranking de jugadores">
        <div className={`${styles.row} ${styles.tableHeader}`} role="row">
          <span>Pos.</span><span>Entrenador</span><span>Puntos</span>
          <span>Medallas</span><span>Precisión</span><span>Intentos</span>
        </div>
        {ranking.leaders.map(player => (
          <RankingRow
            key={player.username}
            player={player}
            isCurrent={player.username === currentUsername}
          />
        ))}
      </div>
    </section>
  );
}
