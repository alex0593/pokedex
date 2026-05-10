'use client';

import React, { useState, useEffect } from 'react';
import { WhoIsThatPokemon } from '../../components/WhoIsThatPokemon';
import { UserProfileView } from '../../components/UserProfileView';
import { getLoggedUser, logout } from '../../services/authService';
import { AuthModal } from '../../components/AuthModal';
import { MiniNav } from '../../components/MiniNav';
import styles from './page.module.css';

export default function GamePage() {
  const [user, setUser] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [view, setView] = useState<'game' | 'profile'>('game');

  useEffect(() => {
    setUser(getLoggedUser());
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    setView('game');
  };

  return (
    <main className={styles.mainContainer}>
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <h1 className={styles.title}>POKEDEX PRO MAX</h1>
          {user ? (
            <div className={styles.userStatus}>
              <span className={styles.userName}>Hola, {user}</span>
              <button onClick={handleLogout} className={styles.logoutBtn}>Cerrar Sesión</button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} className={styles.loginBtn}>Entrar</button>
          )}
        </div>
        
        <MiniNav />

        <div className={styles.gameToggle}>
          <button 
            className={`${styles.toggleBtn} ${view === 'game' ? styles.active : ''}`}
            onClick={() => setView('game')}
          >
            🎮 Jugar
          </button>
          {user && (
            <button 
              className={`${styles.toggleBtn} ${view === 'profile' ? styles.active : ''}`}
              onClick={() => setView('profile')}
            >
              🏆 Mis Logros
            </button>
          )}
        </div>
      </header>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={(uname) => {
            setUser(uname);
            setShowAuth(false);
          }}
        />
      )}
      
      <div className={styles.gameWrapper}>
        {view === 'profile' && user ? (
          <UserProfileView username={user} />
        ) : (
          <WhoIsThatPokemon />
        )}
      </div>

      <footer className={styles.footer}>
        <p>&copy; 2026 POKEDEX &bull; PRO MAX</p>
      </footer>
    </main>
  );
}
