'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../contexts/AuthContext';
import { MiniNav } from './MiniNav';
import styles from './PageLayout.module.css';

const AuthModal = dynamic(
  () => import('./AuthModal').then(mod => ({ default: mod.AuthModal })),
  { ssr: false },
);

interface PageLayoutProps {
  /** Contenido principal de la página. */
  children: React.ReactNode;
  /**
   * Slot opcional debajo de la barra de nav.
   * Usado por game/page.tsx para mostrar controles extra.
   */
  headerSlot?: React.ReactNode;
}

/**
 * Layout compartido: una única barra sticky (logo | nav | auth)
 * + footer + botón "volver arriba".
 *
 * El header no-sticky anterior fue eliminado para evitar el
 * doble header en móvil.
 */
export const PageLayout: React.FC<PageLayoutProps> = ({ children, headerSlot }) => {
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <>
      {/* ── Única barra sticky: logo | nav | auth ── */}
      <header className={styles.stickyNav}>
        <div className={styles.navRow}>
          {/* Logo compacto — se oculta en pantallas muy pequeñas */}
          <span className={styles.navLogo} aria-label="POKEDEX">POKÉDEX</span>

          {/* Navegación central (scroll horizontal en móvil) */}
          <div className={styles.navCenter}>
            <MiniNav />
          </div>

          {/* Auth a la derecha */}
          <div className={styles.navAuth}>
            {user ? (
              <>
                <span className={styles.userName} title={`Sesión: ${user}`}>{user}</span>
                <button
                  onClick={logout}
                  className={styles.logoutBtn}
                  type="button"
                >
                  Salir
                </button>
              </>
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
        </div>

        {/* Slot extra debajo del navRow (ej: controles del juego) */}
        {headerSlot && (
          <div className={styles.headerSlot}>{headerSlot}</div>
        )}
      </header>

      {children}

      <footer className={styles.footer}>
        <p>&copy; 2026 POKEDEX &bull; PRO MAX</p>
      </footer>

      {/* Botón flotante "volver arriba" */}
      {showBackToTop && (
        <button
          className={styles.backToTop}
          onClick={scrollToTop}
          type="button"
          aria-label="Volver arriba"
          title="Volver arriba"
        >
          ↑
        </button>
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={(username: string) => {
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
