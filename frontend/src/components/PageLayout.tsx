'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../contexts/AuthContext';
import { MiniNav } from './MiniNav';
import styles from './PageLayout.module.css';

const AuthModal = dynamic(
  () => import('./AuthModal').then(mod => ({ default: mod.AuthModal })),
  { ssr: false },
);

interface PageLayoutProps {
  /** Contenido principal de la página (entre el header y el footer). */
  children: React.ReactNode;
  /**
   * Slot opcional para insertar elementos adicionales en el header,
   * debajo de MiniNav. Usado por game/page.tsx para el toggle Jugar/Mis Logros.
   */
  headerSlot?: React.ReactNode;
}

/**
 * Layout compartido para todas las páginas de catálogo y juego.
 * Provee header (título + auth + MiniNav) y footer comunes,
 * eliminando la duplicación que existía en las 6 páginas.
 *
 * Usa useAuth() del AuthContext existente — NO gestiona auth state propia.
 */
export const PageLayout: React.FC<PageLayoutProps> = ({ children, headerSlot }) => {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <h1 className={styles.title}>POKEDEX PRO MAX</h1>

          {user ? (
            <div className={styles.userStatus}>
              <span className={styles.userName}>Hola, {user}</span>
              <button
                onClick={logout}
                className={styles.logoutBtn}
                type="button"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className={styles.loginBtn}
              type="button"
            >
              Entrar
            </button>
          )}
        </div>

        <MiniNav />

        {headerSlot && (
          <div className={styles.headerSlot}>
            {headerSlot}
          </div>
        )}
      </header>

      {children}

      <footer className={styles.footer}>
        <p>&copy; 2026 POKEDEX &bull; PRO MAX</p>
      </footer>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={(username: string) => {
            // AuthModal guardó el usuario en localStorage via authService.login.
            // Disparamos un StorageEvent manualmente para notificar al AuthContext
            // en la misma pestaña (el listener nativo solo se activa en otras pestañas).
            window.dispatchEvent(
              new StorageEvent('storage', { key: 'poke_user', newValue: username }),
            );
            setShowAuth(false);
          }}
        />
      )}
    </>
  );
};
