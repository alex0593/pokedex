'use client';

import React from 'react';
import Image from 'next/image';
import { useTriviaGame } from '../hooks/useTriviaGame';
import styles from './WhoIsThatPokemon.module.css';

const WhoIsThatPokemonContent: React.FC = () => {
    const { quiz, revealed, score, highScore, loading, message, lastSelected, timeLeft, handleGuess, handleNext } = useTriviaGame();

    if (loading && !quiz) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Cargando desafío...</p>
            </div>
        );
    }

    const isCorrectAnswer = lastSelected === quiz?.target.name;

    return (
        <div className={styles.container}>
            <div className={styles.topBar}>
                <div className={styles.scoreGroup}>
                    <span className={styles.scoreBadge}>Puntos: {score}</span>
                    <span className={styles.scoreBadge} style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                        Récord: {highScore}
                    </span>
                </div>
                {revealed && (
                    <button onClick={handleNext} className={styles.nextBtn}>
                        Pasar ➔
                    </button>
                )}
            </div>

            {!revealed && (
                <div className={styles.timerContainer}>
                    <div
                        className={[
                            styles.timerBar,
                            timeLeft <= 3 ? styles.timerUrgent : '',
                        ].filter(Boolean).join(' ')}
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
                            alt="Pokemon Misterioso"
                            className={styles.mysteryImage}
                            width={220}
                            height={220}
                        />
                    )}
                    <div className={styles.bgCircle} />
                </div>

                <h2
                    className={styles.message}
                    style={{ color: revealed ? (isCorrectAnswer ? '#2ecc71' : '#e74c3c') : 'white', padding: '0 20px' }}
                >
                    {message}
                </h2>

                <div className={styles.optionsGrid}>
                    {quiz?.options.map(option => (
                        <button
                            key={option}
                            onClick={() => handleGuess(option)}
                            disabled={revealed}
                            aria-label={`Seleccionar Pokémon ${option}`}
                            className={[
                                styles.optionBtn,
                                revealed && option === quiz.target.name ? styles.correct : '',
                                revealed && option === lastSelected && option !== quiz.target.name ? styles.wrong : '',
                            ].filter(Boolean).join(' ')}
                        >
                            {option}
                        </button>
                    ))}
                </div>

                {revealed && (
                    <p style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.6 }}>
                        {isCorrectAnswer ? '¡Bien! Cambiando en un momento...' : 'Cambiando Pokémon automáticamente...'}
                    </p>
                )}
            </div>
        </div>
    );
};

export const WhoIsThatPokemon = React.memo(WhoIsThatPokemonContent);
