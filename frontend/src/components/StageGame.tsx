'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useStageGame } from '../hooks/useTriviaGame';
import { getTypeBgColor } from '../utils/typeColors';
import { translate } from '../utils/translations';
import styles from './StageGame.module.css';

const TYPE_EMOJI: Record<string, string> = {
  fire: '🔥', water: '💧', grass: '🌿', electric: '⚡',
  ice: '❄️', fighting: '🥊', ground: '🌍', flying: '🦅',
  psychic: '🔮', bug: '🐛', rock: '🪨', ghost: '👻',
  dragon: '🐉', dark: '🌑', steel: '⚙️', fairy: '✨',
  normal: '⭐', poison: '☠️',
};

const REGION_LABELS: Record<string, string> = {
  kanto: 'Kanto', johto: 'Johto', hoenn: 'Hoenn', sinnoh: 'Sinnoh',
  unova: 'Teselia', kalos: 'Kalos', alola: 'Alola', galar: 'Galar', paldea: 'Paldea',
};

interface StageGameProps {
  region: string;
  typeName: string;
  onBack: () => void;
  /** Llamado cuando el intento termina — permite al padre refrescar el progreso. */
  onAttemptComplete?: (passed: boolean, regionCompleted: boolean) => void;
}

export const StageGame: React.FC<StageGameProps> = ({
  region,
  typeName,
  onBack,
  onAttemptComplete,
}) => {
  const {
    quiz, revealed, questionNumber, correctCount,
    loading, message, lastSelected, timeLeft,
    finished, attemptPassed, regionCompleted, newAchievements,
    savingAnswer, saveError,
    handleGuess, handleNext, initStage, retrySave,
  } = useStageGame(region, typeName);

  const typeColor = getTypeBgColor(typeName);
  const isCorrectAnswer = lastSelected === quiz?.target.name;

  // Cuando termina, notificar al padre
  React.useEffect(() => {
    if (finished) {
      onAttemptComplete?.(attemptPassed, regionCompleted);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // ── Pantalla de resultado ──────────────────────────────────────────────────
  if (finished) {
    const STAGE_PASS_THRESHOLD = 7;
    return (
      <motion.div
        className={styles.resultContainer}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <div
          className={styles.resultCard}
          style={{ borderColor: attemptPassed ? '#22c55e' : '#ef4444' }}
        >
          <div className={styles.resultEmoji}>
            {attemptPassed ? '🎉' : '😤'}
          </div>

          <h2 className={styles.resultTitle} style={{ color: attemptPassed ? '#22c55e' : '#ef4444' }}>
            {attemptPassed ? '¡Stage Superado!' : 'Inténtalo de Nuevo'}
          </h2>

          <div className={styles.resultScore}>
            <span className={styles.scoreNum} style={{ color: typeColor }}>
              {correctCount < STAGE_PASS_THRESHOLD ? correctCount : (attemptPassed ? correctCount : correctCount)}
            </span>
            <span className={styles.scoreDen}> / 10</span>
            <span className={styles.scoreLabel}> correctas</span>
          </div>

          {regionCompleted && (
            <motion.div
              className={styles.regionBadge}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
            >
              🏆 ¡Medalla de {REGION_LABELS[region] ?? region} Obtenida!
            </motion.div>
          )}

          {newAchievements.length > 0 && (
            <div className={styles.achievements}>
              {newAchievements.map(ach => (
                <span key={ach} className={styles.achTag}>🏅 {ach}</span>
              ))}
            </div>
          )}

          <p className={styles.resultHint}>
            {attemptPassed
              ? `Necesitabas ${STAGE_PASS_THRESHOLD}/10 para superar el stage. ¡Lo lograste!`
              : `Necesitas ${STAGE_PASS_THRESHOLD}/10 para superar el stage. ¡Tú puedes!`}
          </p>

          <div className={styles.resultActions}>
            <button
              className={styles.retryBtn}
              onClick={() => initStage()}
              type="button"
              style={{ background: typeColor }}
            >
              {attemptPassed ? '🔄 Repetir Stage' : '🔄 Intentar de Nuevo'}
            </button>
            <button className={styles.backBtn} onClick={onBack} type="button">
              ← Volver a Stages
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Pantalla de carga ──────────────────────────────────────────────────────
  if (loading && !quiz) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Preparando el stage...</p>
      </div>
    );
  }

  // ── Error: no se pudo cargar la pregunta ──────────────────────────────────
  if (!loading && !quiz) {
    return (
      <div className={styles.loading}>
        <p style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</p>
        <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
          No se pudo cargar el quiz. Puede que no haya suficientes Pokémon de este tipo en esta región.
        </p>
        <button
          className={styles.retryBtn}
          onClick={() => initStage()}
          type="button"
          style={{ background: typeColor }}
        >
          🔄 Reintentar
        </button>
        <button
          className={styles.backBtn}
          onClick={onBack}
          type="button"
          style={{ marginTop: '10px' }}
        >
          ← Volver a Stages
        </button>
      </div>
    );
  }

  // ── Juego ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      {/* ── Cabecera del stage ── */}
      <div className={styles.stageHeader}>
        <button className={styles.backBtnSmall} onClick={onBack} type="button">
          ← Stages
        </button>
        <div className={styles.stageBreadcrumb}>
          <span className={styles.regionLabel}>{REGION_LABELS[region] ?? region}</span>
          <span className={styles.separator}>›</span>
          <span className={styles.typeLabel} style={{ color: typeColor }}>
            {TYPE_EMOJI[typeName]} {translate(typeName, 'types')}
          </span>
        </div>
        <div className={styles.questionCounter}>
          <span className={styles.qNum}>{questionNumber}</span>
          <span className={styles.qTotal}>/10</span>
        </div>
      </div>

      {/* ── Barra de progreso del stage ── */}
      <div className={styles.stageProgress}>
        <div className={styles.stageProgressFill}
          style={{ width: `${(questionNumber / 10) * 100}%`, background: typeColor }}
        />
      </div>

      {/* ── Contador de aciertos ── */}
      <div className={styles.correctCounter}>
        <span style={{ color: typeColor }}>✅ {correctCount}</span>
        <span style={{ color: 'var(--text-secondary)' }}> aciertos</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}> · </span>
        <span style={{ color: 'var(--text-secondary)' }}>Necesitas 7+</span>
      </div>

      {/* ── Timer ── */}
      {!revealed && (
        <div className={styles.timerContainer}>
          <div
            className={`${styles.timerBar} ${timeLeft <= 3 ? styles.timerUrgent : ''}`}
            style={{
              width: `${(timeLeft / 10) * 100}%`,
              background:
                timeLeft <= 3
                  ? 'linear-gradient(90deg, #e74c3c, #c0392b)'
                  : timeLeft <= 5
                    ? 'linear-gradient(90deg, #f39c12, #e67e22)'
                    : undefined,
            }}
          />
        </div>
      )}

      {/* ── Área de juego ── */}
      <div className={styles.gameArea}>
        <div className={[
          styles.imageWrapper,
          revealed ? styles.revealed : '',
          revealed && !isCorrectAnswer && lastSelected !== 'timeout' ? styles.shake : '',
          revealed && isCorrectAnswer ? styles.successGlow : '',
        ].filter(Boolean).join(' ')}>
          {quiz && (
            <Image
              key={quiz.target.id}
              src={quiz.target.image}
              alt="Pokémon misterioso"
              className={styles.mysteryImage}
              width={200}
              height={200}
            />
          )}
          <div className={styles.bgCircle} />
        </div>

        <h2
          className={styles.message}
          style={{ color: revealed ? (isCorrectAnswer ? '#2ecc71' : '#e74c3c') : 'white' }}
        >
          {message}
        </h2>

        <div className={styles.optionsGrid}>
          {quiz?.options.map(option => (
            <button
              key={option}
              onClick={() => handleGuess(option)}
              disabled={revealed}
              className={[
                styles.optionBtn,
                revealed && option === quiz.target.name ? styles.correct : '',
                revealed && option === lastSelected && option !== quiz.target.name ? styles.wrong : '',
              ].filter(Boolean).join(' ')}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>

        {revealed && savingAnswer && (
          <div className={styles.nextHint} role="status">Guardando respuesta...</div>
        )}

        {revealed && saveError && (
          <div className={styles.nextHint} role="alert">
            <span>{saveError}</span>
            <button onClick={retrySave} className={styles.nextBtn} type="button">
              Reintentar guardado
            </button>
          </div>
        )}

        {revealed && !savingAnswer && !saveError && (
          <div className={styles.nextHint}>
            <button onClick={handleNext} className={styles.nextBtn} type="button">
              {questionNumber >= 10 ? 'Ver Resultado ➜' : 'Siguiente ➔'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
