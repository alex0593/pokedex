'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { PageLayout } from '../../components/PageLayout';
import { fetchRegionsProgress } from '../../services/authService';
import type { RegionProgress } from '../../types/game';
import styles from './page.module.css';

const WhoIsThatPokemon = dynamic(
  () => import('../../components/WhoIsThatPokemon').then(mod => ({ default: mod.WhoIsThatPokemon })),
  { ssr: false },
);
const UserProfileView = dynamic(
  () => import('../../components/UserProfileView').then(mod => ({ default: mod.UserProfileView })),
  { ssr: false },
);
const RegionMap = dynamic(
  () => import('../../components/RegionMap').then(mod => ({ default: mod.RegionMap })),
  { ssr: false },
);
const StageSelect = dynamic(
  () => import('../../components/StageSelect').then(mod => ({ default: mod.StageSelect })),
  { ssr: false },
);
const StageGame = dynamic(
  () => import('../../components/StageGame').then(mod => ({ default: mod.StageGame })),
  { ssr: false },
);

type GameView = 'hub' | 'free' | 'regions' | 'stage-select' | 'stage-game' | 'profile';

export default function GamePage() {
  const { user } = useAuth();
  const [view, setView] = useState<GameView>('hub');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [regionsProgress, setRegionsProgress] = useState<RegionProgress[]>([]);

  // Carga el progreso cuando el usuario inicia sesión
  const loadProgress = useCallback(async () => {
    if (!user) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('poke_token') : null;
    if (!token) return;
    try {
      const data = await fetchRegionsProgress(token);
      setRegionsProgress(data);
    } catch {
      // silencioso si no hay conexión
    }
  }, [user]);

  useEffect(() => {
    loadProgress(); // eslint-disable-line react-hooks/set-state-in-effect -- carga async de progreso regional al montar
  }, [loadProgress]);

  // Si el usuario cierra sesión, volver al hub y limpiar progreso
  useEffect(() => {
    if (!user) {
      setRegionsProgress([]); // eslint-disable-line react-hooks/set-state-in-effect -- sincronización de estado con auth
      if (view === 'profile' || view === 'stage-game' || view === 'stage-select') {
        setView('hub');
      }
    }
  }, [user, view]);

  const handleSelectRegion = (region: string) => {
    setSelectedRegion(region);
    setView('stage-select');
  };

  const handleSelectStage = (typeName: string) => {
    setSelectedType(typeName);
    setView('stage-game');
  };

  const handleAttemptComplete = async () => {
    // Refrescar progreso regional después de cada intento completado
    await loadProgress();
  };

  const getRegionProgress = (region: string) =>
    regionsProgress.find(r => r.region_name === region) ?? null;

  // ── Hub (pantalla de selección de modo) ──────────────────────────────────
  if (view === 'hub') {
    return (
      <main className={styles.mainContainer}>
        <PageLayout>
          <div className={styles.gameWrapper}>
            <div className={styles.hubContainer}>
              <h2 className={styles.hubTitle}>¿Cómo quieres jugar?</h2>
              <p className={styles.hubSubtitle}>Elige tu modo de juego</p>

              <div className={styles.hubGrid}>
                <motion.button
                  className={styles.modeCard}
                  onClick={() => setView('free')}
                  type="button"
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <span className={styles.modeIcon}>🕹️</span>
                  <h3 className={styles.modeName}>Modo Libre</h3>
                  <p className={styles.modeDesc}>
                    El clásico &ldquo;¿Quién es ese Pokémon?&rdquo; infinito. Sin límite de preguntas.
                  </p>
                </motion.button>

                <motion.button
                  className={`${styles.modeCard} ${styles.modeCardAccent}`}
                  onClick={() => setView('regions')}
                  type="button"
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <span className={styles.modeIcon}>🗺️</span>
                  <h3 className={styles.modeName}>Aventura por Regiones</h3>
                  <p className={styles.modeDesc}>
                    Viaja por Kanto, Johto, Hoenn… Conquista stages por tipo y gana medallas.
                  </p>
                  {user && regionsProgress.length > 0 && (
                    <span className={styles.modeBadge}>
                      {regionsProgress.filter(r => r.badge_earned).length} / {regionsProgress.length} medallas
                    </span>
                  )}
                </motion.button>

                {user && (
                  <motion.button
                    className={`${styles.modeCard} ${styles.modeCardLogros}`}
                    onClick={() => setView('profile')}
                    type="button"
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <span className={styles.modeIcon}>🏆</span>
                    <h3 className={styles.modeName}>Mis Logros</h3>
                    <p className={styles.modeDesc}>
                      Tu historial, estadísticas y medallas regionales obtenidas.
                    </p>
                  </motion.button>
                )}
              </div>

              {!user && (
                <p className={styles.loginHint}>
                  💡 Inicia sesión para guardar tu progreso y ganar medallas
                </p>
              )}
            </div>
          </div>
        </PageLayout>
      </main>
    );
  }

  // ── Vistas de juego ───────────────────────────────────────────────────────
  const backToHub = (
    <button
      className={styles.hubBackBtn}
      onClick={() => setView('hub')}
      type="button"
    >
      ← Menú Principal
    </button>
  );

  return (
    <main className={styles.mainContainer}>
      <PageLayout>
        <div className={styles.gameWrapper}>
          <AnimatePresence mode="wait">
            {view === 'free' && (
              <motion.div key="free"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
              >
                <div className={styles.viewHeader}>{backToHub}</div>
                <WhoIsThatPokemon />
              </motion.div>
            )}

            {view === 'regions' && (
              <motion.div key="regions"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
              >
                <RegionMap
                  regionsProgress={regionsProgress}
                  onSelectRegion={handleSelectRegion}
                  onBack={() => setView('hub')}
                />
              </motion.div>
            )}

            {view === 'stage-select' && selectedRegion && (
              <motion.div key="stage-select"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
              >
                <StageSelect
                  regionName={selectedRegion}
                  regionProgress={getRegionProgress(selectedRegion)}
                  onSelectStage={handleSelectStage}
                  onBack={() => setView('regions')}
                  isLoggedIn={!!user}
                />
              </motion.div>
            )}

            {view === 'stage-game' && selectedRegion && selectedType && (
              <motion.div key="stage-game"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
              >
                <StageGame
                  region={selectedRegion}
                  typeName={selectedType}
                  onBack={() => setView('stage-select')}
                  onAttemptComplete={handleAttemptComplete}
                />
              </motion.div>
            )}

            {view === 'profile' && user && (
              <motion.div key="profile"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
              >
                <div className={styles.viewHeader}>{backToHub}</div>
                <UserProfileView username={user} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PageLayout>
    </main>
  );
}
