'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { RegionProgress, StageProgress } from '../types/game';
import { REGION_STAGES } from '../types/game';
import { getTypeBgColor, getTypeIconUrl } from '../utils/typeColors';
import { translate } from '../utils/translations';
import styles from './StageSelect.module.css';

const REGION_LABELS: Record<string, string> = {
  kanto: 'Kanto', johto: 'Johto', hoenn: 'Hoenn', sinnoh: 'Sinnoh',
  unova: 'Teselia', kalos: 'Kalos', alola: 'Alola', galar: 'Galar', paldea: 'Paldea',
};

/** Clasifica un stage en tres estados visuales */
function stageState(s: StageProgress): 'completed' | 'attempted' | 'new' {
  if (s.completed) return 'completed';
  if (s.attempts > 0) return 'attempted';
  return 'new';
}

interface StageSelectProps {
  regionName: string;
  regionProgress: RegionProgress | null;
  onSelectStage: (typeName: string) => void;
  onBack: () => void;
  isLoggedIn?: boolean;
}

export const StageSelect: React.FC<StageSelectProps> = ({
  regionName,
  regionProgress,
  onSelectStage,
  onBack,
  isLoggedIn = false,
}) => {
  const regionLabel = REGION_LABELS[regionName] ?? regionName;

  // ── Stages: usa datos reales si existen, fallback de tipos si no ──────────
  const stages: StageProgress[] = regionProgress?.stages.length
    ? regionProgress.stages
    : (REGION_STAGES[regionName] ?? []).map(typeName => ({
        region_name: regionName,
        type_name: typeName,
        correct_count: 0,
        total_count: 0,
        attempts: 0,
        completed: false,
      }));

  const completedCount = stages.filter(s => s.completed).length;
  const badgeEarned    = regionProgress?.badge_earned ?? false;

  return (
    <div className={styles.container}>

      {/* ── Cabecera ── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} type="button">
          ← Regiones
        </button>
        <div className={styles.regionTitle}>
          <h2 className={styles.regionName}>{regionLabel}</h2>
          {badgeEarned ? (
            <span className={styles.badgeEarned}>🏆 Región Conquistada</span>
          ) : (
            <span className={styles.badgeProgress}>
              {completedCount} / {stages.length} stages completados
            </span>
          )}
        </div>
      </div>

      {/* ── Barra de progreso global de la región ── */}
      <div className={styles.regionProgressBar}>
        <div
          className={styles.regionProgressFill}
          style={{ width: `${(completedCount / stages.length) * 100}%` }}
        />
      </div>

      {/* ── Hint de login ── */}
      {!isLoggedIn && (
        <div className={styles.loginHint}>
          💡 Inicia sesión para guardar tu progreso y ganar la medalla de {regionLabel}
        </div>
      )}

      {/* ── Grid de stages ── */}
      <div className={styles.stagesGrid}>
        {stages.map((stage, idx) => {
          const typeColor  = getTypeBgColor(stage.type_name);
          const typeIcon   = getTypeIconUrl(stage.type_name);
          const state      = stageState(stage);

          return (
            <motion.button
              key={stage.type_name}
              className={[
                styles.stageCard,
                state === 'completed' ? styles.stageCompleted : '',
                state === 'attempted' ? styles.stageAttempted : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectStage(stage.type_name)}
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.04, y: -3 }}
              whileTap={{ scale: 0.96 }}
              style={{ '--type-color': typeColor } as React.CSSProperties}
            >
              {/* Indicador de estado en esquina superior derecha */}
              {state === 'completed' && (
                <span className={styles.stateTag} style={{ color: '#22c55e' }}>✓</span>
              )}
              {state === 'attempted' && (
                <span className={styles.stateTag} style={{ color: '#f59e0b' }}>
                  {stage.attempts}✕
                </span>
              )}

              {/* Icono oficial del tipo (badge pill de Scarlet/Violet) */}
              <div className={styles.typeIconWrapper}>
                {typeIcon ? (
                  <Image
                    src={typeIcon}
                    alt={stage.type_name}
                    width={96}
                    height={26}
                    className={styles.typeIcon}
                    unoptimized
                    loading="lazy"
                  />
                ) : (
                  <span className={styles.typeIconFallback}>?</span>
                )}
              </div>

              {/* Nombre del tipo en español */}
              <span className={styles.typeName} style={{ color: typeColor }}>
                {translate(stage.type_name, 'types')}
              </span>

              {/* Mini-barra de progreso del último intento o completado */}
              {state === 'completed' ? (
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: '100%', background: typeColor }} />
                </div>
              ) : stage.attempts > 0 ? (
                <>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${(stage.correct_count / 10) * 100}%`, background: typeColor }}
                    />
                  </div>
                  <span className={styles.attemptsText}>
                    {stage.attempts} intento{stage.attempts !== 1 ? 's' : ''} · mejor 7/10
                  </span>
                </>
              ) : (
                <span className={styles.attemptsText}>Sin intentos · Necesitas 7/10</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
