'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../contexts/AuthContext';
import { PageLayout } from '../../components/PageLayout';
import styles from './page.module.css';

const WhoIsThatPokemon = dynamic(
  () => import('../../components/WhoIsThatPokemon').then(mod => ({ default: mod.WhoIsThatPokemon })),
  { ssr: false },
);
const UserProfileView = dynamic(
  () => import('../../components/UserProfileView').then(mod => ({ default: mod.UserProfileView })),
  { ssr: false },
);

export default function GamePage() {
  const { user } = useAuth();
  const [view, setView] = useState<'game' | 'profile'>('game');

  // Si el usuario cierra sesión mientras ve su perfil, volver al juego
  React.useEffect(() => {
    if (!user && view === 'profile') setView('game');
  }, [user, view]);

  const gameToggle = (
    <div className={styles.gameToggle}>
      <button
        className={`${styles.toggleBtn} ${view === 'game' ? styles.active : ''}`}
        onClick={() => setView('game')}
        type="button"
      >
        🎮 Jugar
      </button>
      {user && (
        <button
          className={`${styles.toggleBtn} ${view === 'profile' ? styles.active : ''}`}
          onClick={() => setView('profile')}
          type="button"
        >
          🏆 Mis Logros
        </button>
      )}
    </div>
  );

  return (
    <main className={styles.mainContainer}>
      <PageLayout headerSlot={gameToggle}>
        <div className={styles.gameWrapper}>
          {view === 'profile' && user ? (
            <UserProfileView username={user} />
          ) : (
            <WhoIsThatPokemon />
          )}
        </div>
      </PageLayout>
    </main>
  );
}
