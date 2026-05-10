'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchQuiz } from '../services/pokemonService';
import { saveGameResult, getLoggedUser } from '../services/authService';
import { PokemonDetail } from '../types/pokemon';
import styles from './WhoIsThatPokemon.module.css';

type QuizData = { target: PokemonDetail; options: string[] };

export const WhoIsThatPokemon: React.FC = () => {
    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [revealed, setRevealed] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('¿Quién es este Pokémon?');
    const [lastSelected, setLastSelected] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(10);

    // --- Refs to prevent stale closures in async/timer callbacks ---
    const quizRef = useRef<QuizData | null>(null);
    const nextQuizRef = useRef<QuizData | null>(null);
    const revealedRef = useRef(false);
    const scoreRef = useRef(0);      // <-- FIX: track score in ref
    const highScoreRef = useRef(0);  // <-- FIX: track highScore in ref
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const autoNextRef = useRef<NodeJS.Timeout | null>(null);

    // Sync refs with state
    useEffect(() => { quizRef.current = quiz; }, [quiz]);
    useEffect(() => { revealedRef.current = revealed; }, [revealed]);
    useEffect(() => { scoreRef.current = score; }, [score]);
    useEffect(() => { highScoreRef.current = highScore; }, [highScore]);

    useEffect(() => {
        const savedHigh = localStorage.getItem('pokeHighScore');
        if (savedHigh) {
            const val = parseInt(savedHigh);
            setHighScore(val);
            highScoreRef.current = val;
        }
        initGame();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoNextRef.current) clearTimeout(autoNextRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stopAllTimers = () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (autoNextRef.current) { clearTimeout(autoNextRef.current); autoNextRef.current = null; }
    };

    const startTimer = useCallback(() => {
        stopAllTimers();
        setTimeLeft(10);

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0.1) {
                    clearInterval(timerRef.current!);
                    timerRef.current = null;
                    // Only fire if not already revealed
                    if (!revealedRef.current) {
                        handleGuess('timeout');
                    }
                    return 0;
                }
                return parseFloat((prev - 0.1).toFixed(2));
            });
        }, 100);
    }, []); // eslint-disable-line

    const initGame = async () => {
        setLoading(true);
        stopAllTimers();
        try {
            const first = await fetchQuiz();
            setQuiz(first);
            quizRef.current = first;
            // Pre-fetch next question in background
            fetchQuiz().then(q => { nextQuizRef.current = q; }).catch(() => { });
            // Reset game state
            setRevealed(false);
            revealedRef.current = false;
            setLastSelected(null);
            setMessage('¿Quién es este Pokémon?');
            setLoading(false);
            startTimer();
        } catch (e) {
            console.error('Game init failed', e);
            setLoading(false);
        }
    };

    const handleGuess = (name: string) => {
        // Guard: already revealed or no quiz loaded
        if (revealedRef.current) return;
        const currentQuiz = quizRef.current;
        if (!currentQuiz) return;

        stopAllTimers();

        setRevealed(true);
        revealedRef.current = true;
        setLastSelected(name);

        const isCorrect = name === currentQuiz.target.name;

        if (isCorrect) {
            const newScore = scoreRef.current + 1;
            setScore(newScore);
            scoreRef.current = newScore;

            if (newScore > highScoreRef.current) {
                setHighScore(newScore);
                highScoreRef.current = newScore;
                localStorage.setItem('pokeHighScore', newScore.toString());
            }

            setMessage(`¡Excelente! Es ${currentQuiz.target.name.toUpperCase()}`);

            // Save to server if logged in
            const username = getLoggedUser();
            if (username) saveGameResult(username, true, newScore);

            // Auto-advance on success
            autoNextRef.current = setTimeout(() => handleNext(), 1800);
        } else {
            setScore(0);
            scoreRef.current = 0;

            if (name === 'timeout') {
                setMessage(`¡Tiempo! Era ${currentQuiz.target.name.toUpperCase()}`);
            } else {
                setMessage(`¡Incorrecto! Era ${currentQuiz.target.name.toUpperCase()}`);
            }

            // Save to server if logged in
            const username = getLoggedUser();
            if (username) saveGameResult(username, false, 0);

            // Auto-advance on fail (slower, so user sees correct answer)
            autoNextRef.current = setTimeout(() => handleNext(), 3000);
        }
    };

    const handleNext = async () => {
        stopAllTimers();

        if (nextQuizRef.current) {
            const nextData = nextQuizRef.current;
            nextQuizRef.current = null;

            setQuiz(nextData);
            quizRef.current = nextData;
            setRevealed(false);
            revealedRef.current = false;
            setLastSelected(null);
            setMessage('¿Quién es este Pokémon?');
            startTimer();

            // Pre-fetch next
            fetchQuiz().then(q => { nextQuizRef.current = q; }).catch(() => { });
        } else {
            // Buffer not ready, fetch manually
            await initGame();
        }
    };

    // ---- RENDER ----

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
            {/* TOP BAR */}
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

            {/* TIMER BAR */}
            {!revealed && (
                <div className={styles.timerContainer}>
                    <div className={styles.timerBar} style={{ width: `${(timeLeft / 10) * 100}%` }} />
                </div>
            )}

            {/* GAME AREA */}
            <div className={styles.gameArea}>
                <div className={[
                    styles.imageWrapper,
                    revealed ? styles.revealed : '',
                    revealed && !isCorrectAnswer && lastSelected !== 'timeout' ? styles.shake : '',
                    revealed && isCorrectAnswer ? styles.successGlow : '',
                ].filter(Boolean).join(' ')}>
                    {quiz && (
                        <img
                            key={quiz.target.id}
                            src={quiz.target.image}
                            alt="Pokemon Misterioso"
                            className={styles.mysteryImage}
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
