'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '../contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { MiniNav } from './MiniNav';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './PageLayout.module.css';

const AuthModal = dynamic(
  () => import('./AuthModal').then(mod => ({ default: mod.AuthModal })),
  { ssr: false },
);

/** Mismo array que MiniNav — se duplica aquí para el menú móvil */
const NAV_ITEMS = [
  { name: 'Inicio',       path: '/' },
  { name: 'Pokémon',      path: '/pokemon' },
  { name: 'Objetos',      path: '/items' },
  { name: 'Bayas',        path: '/berries' },
  { name: 'Habilidades',  path: '/abilities' },
  { name: 'Movimientos',  path: '/moves' },
  { name: 'Juego',        path: '/game' },
  { name: 'Favoritos',    path: '/favorites' },
];

interface PageLayoutProps {
  children: React.ReactNode;
  headerSlot?: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children, headerSlot }) => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Cerrar el menú al cambiar de ruta
  useEffect(() => { setMenuOpen(false); }, [pathname]); // eslint-disable-line react-hooks/set-state-in-effect

  // Bloquear scroll del body mientras el menú está abierto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleLogout = () => { logout(); setMenuOpen(false); };

  return (
    <>
      {/* ── Barra sticky: logo | nav (desktop) | auth + hamburger ── */}
      <header className={styles.stickyNav}>
        <div className={styles.navRow}>
          {/* Logo */}
          <span className={styles.navLogo}>POKÉDEX</span>

          {/* Nav horizontal — solo en desktop */}
          <div className={styles.navCenter}>
            <MiniNav />
          </div>

          <div className={styles.navAuth}>
            {/* Botones auth — solo en desktop */}
            <div className={styles.authDesktop}>
              {user ? (
                <>
                  <span className={styles.userName} title={`Sesión: ${user}`}>{user}</span>
                  <button onClick={logout} className={styles.logoutBtn} type="button">
                    Salir
                  </button>
                </>
              ) : (
                <button onClick={() => setShowAuth(true)} className={styles.loginBtn} type="button">
                  Entrar
                </button>
              )}
            </div>

            {/* Hamburger — solo en móvil */}
            <button
              className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
              onClick={() => setMenuOpen(v => !v)}
              type="button"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {headerSlot && <div className={styles.headerSlot}>{headerSlot}</div>}
      </header>

      {/* ── Menú móvil desplegable ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop oscuro detrás del panel */}
            <motion.div
              className={styles.menuBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
            />

            {/* Panel del menú */}
            <motion.nav
              className={styles.mobileMenu}
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              aria-label="Menú de navegación"
            >
              <ul className={styles.mobileNavList}>
                {NAV_ITEMS.map(item => (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      className={`${styles.mobileNavLink} ${pathname === item.path ? styles.mobileNavLinkActive : ''}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Auth section dentro del menú */}
              <div className={styles.mobileMenuAuth}>
                {user ? (
                  <>
                    <span className={styles.mobileUserName}>👤 {user}</span>
                    <button onClick={handleLogout} className={styles.mobileLogoutBtn} type="button">
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setMenuOpen(false); setShowAuth(true); }}
                    className={styles.mobileLoginBtn}
                    type="button"
                  >
                    Iniciar sesión
                  </button>
                )}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {children}

      <footer className={styles.footer}>
        <p>&copy; 2026 POKEDEX &bull; PRO MAX</p>
        <a
          className={styles.reportLink}
          href="mailto:aalopezalv@gmail.com?subject=Reporte%20de%20error%20-%20Pok%C3%A9dex&body=Describe%20el%20error%2C%20la%20p%C3%A1gina%20y%20los%20pasos%20para%20reproducirlo%3A%0A%0A"
        >
          Reportar un error
        </a>
      </footer>

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
