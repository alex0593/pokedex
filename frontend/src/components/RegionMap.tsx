'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { RegionProgress } from '../types/game';
import styles from './RegionMap.module.css';

interface RegionInfo {
  /** ID del Pokémon legendario mascota — sprite oficial de PokéAPI sprites */
  mascotId: number;
  color: string;
  label: string;
  gen: string;
}

const REGION_INFO: Record<string, RegionInfo> = {
  kanto:  { mascotId: 150,  color: '#EF4444', label: 'Kanto',   gen: 'Gen I'    }, // Mewtwo
  johto:  { mascotId: 249,  color: '#F59E0B', label: 'Johto',   gen: 'Gen II'   }, // Lugia
  hoenn:  { mascotId: 384,  color: '#3B82F6', label: 'Hoenn',   gen: 'Gen III'  }, // Rayquaza
  sinnoh: { mascotId: 483,  color: '#8B5CF6', label: 'Sinnoh',  gen: 'Gen IV'   }, // Dialga
  unova:  { mascotId: 643,  color: '#10B981', label: 'Teselia', gen: 'Gen V'    }, // Reshiram
  kalos:  { mascotId: 716,  color: '#EC4899', label: 'Kalos',   gen: 'Gen VI'   }, // Xerneas
  alola:  { mascotId: 791,  color: '#F97316', label: 'Alola',   gen: 'Gen VII'  }, // Solgaleo
  galar:  { mascotId: 888,  color: '#6366F1', label: 'Galar',   gen: 'Gen VIII' }, // Zacian
  paldea: { mascotId: 1007, color: '#A855F7', label: 'Paldea',  gen: 'Gen IX'   }, // Koraidon
};

/** Sprite oficial (artwork) de PokéAPI — transparente, alta calidad */
const mascotUrl = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

const REGION_ORDER = ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea'];
const TOTAL_STAGES = 54; // 9 regiones × 6 stages

interface RegionMapProps {
  regionsProgress: RegionProgress[];
  onSelectRegion: (region: string) => void;
  onBack: () => void;
}

export const RegionMap: React.FC<RegionMapProps> = ({
  regionsProgress,
  onSelectRegion,
  onBack,
}) => {
  const progressMap = Object.fromEntries(
    regionsProgress.map(r => [r.region_name, r]),
  );

  // Progreso global
  const globalCompleted = regionsProgress.reduce(
    (sum, r) => sum + r.stages.filter(s => s.completed).length,
    0,
  );
  const badgesEarned = regionsProgress.filter(r => r.badge_earned).length;

  return (
    <div className={styles.container}>

      {/* ── Cabecera ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">
          ← Menú
        </button>
        <div className={styles.titleGroup}>
          <h2 className={styles.title}>Aventura por Regiones</h2>
          <p className={styles.subtitle}>
            {globalCompleted > 0
              ? `${globalCompleted} / ${TOTAL_STAGES} stages · ${badgesEarned} / 9 medallas`
              : 'Conquista los 6 stages de cada región para ganar su medalla'}
          </p>
        </div>
      </div>

      {/* ── Grid 3×3 ── */}
      <div className={styles.grid}>
        {REGION_ORDER.map((regionName, idx) => {
          const info        = REGION_INFO[regionName];
          const progress    = progressMap[regionName];
          const completed   = progress?.stages.filter(s => s.completed).length ?? 0;
          const total       = 6;
          const badgeEarned = progress?.badge_earned ?? false;
          const pct         = (completed / total) * 100;

          return (
            <motion.button
              key={regionName}
              className={`${styles.regionCard} ${badgeEarned ? styles.conquered : ''}`}
              onClick={() => onSelectRegion(regionName)}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              style={{ '--region-color': info.color } as React.CSSProperties}
            >
              {badgeEarned && (
                <span className={styles.badgeOverlay} title="¡Región conquistada!">🏆</span>
              )}

              {/* Sprite del legendario mascota */}
              <div className={styles.mascotWrapper}>
                <Image
                  src={mascotUrl(info.mascotId)}
                  alt={regionName}
                  width={64}
                  height={64}
                  className={styles.mascotImg}
                  style={{ filter: `drop-shadow(0 2px 8px ${info.color}55)` }}
                  loading="lazy"
                  unoptimized
                />
              </div>

              <div className={styles.regionLabel}>{info.label}</div>
              <div className={styles.regionGen}>{info.gen}</div>

              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${pct}%`, background: info.color }}
                />
              </div>
              <div className={styles.progressText}>
                {completed}/{total} stages{badgeEarned ? ' · 🏅' : ''}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
