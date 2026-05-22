import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchQuiz } from '../services/pokemonService';
import { saveGameResult, getLoggedUser } from '../services/authService';
import { PokemonDetail } from '../types/pokemon';

type QuizData = { target: PokemonDetail; options: string[] };

interface TriviaGameState {
    quiz: QuizData | null;
    revealed: boolean;
    score: number;
    highScore: number;
    loading: boolean;
    message: string;
    lastSelected: string | null;
    timeLeft: number;
}

interface TriviaGameActions {
    handleGuess: (name: string) => void;
    handleNext: () => Promise<void>;
    initGame: () => Promise<void>;
    startTimer: () => void;
}

export function useTriviaGame(): TriviaGameState & TriviaGameActions {
    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [revealed, setRevealed] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('¿Quién es este Pokémon?');
    const [lastSelected, setLastSelected] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(10);

    const quizRef = useRef<QuizData | null>(null);
    const nextQuizRef = useRef<QuizData | null>(null);
    const revealedRef = useRef(false);
    const scoreRef = useRef(0);
    const highScoreRef = useRef(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const autoNextRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => { quizRef.current = quiz; }, [quiz]);
    useEffect(() => { revealedRef.current = revealed; }, [revealed]);
    useEffect(() => { scoreRef.current = score; }, [score]);
    useEffect(() => { highScoreRef.current = highScore; }, [highScore]);

    const stopAllTimers = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (autoNextRef.current) { clearTimeout(autoNextRef.current); autoNextRef.current = null; }
    }, []);

    const startTimer = useCallback(() => {
        stopAllTimers();
        setTimeLeft(10);

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0.1) {
                    clearInterval(timerRef.current!);
                    timerRef.current = null;
                    if (!revealedRef.current) {
                        handleGuess('timeout');
                    }
                    return 0;
                }
                return parseFloat((prev - 0.1).toFixed(2));
            });
        }, 100);
    }, [stopAllTimers]);

    const initGame = useCallback(async () => {
        setLoading(true);
        stopAllTimers();
        try {
            const first = await fetchQuiz();
            setQuiz(first);
            quizRef.current = first;
            fetchQuiz().then(q => { nextQuizRef.current = q; }).catch(() => { });
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
    }, [stopAllTimers, startTimer]);

    const handleGuess = useCallback((name: string) => {
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

            const username = getLoggedUser();
            if (username) saveGameResult(username, true, newScore);

            autoNextRef.current = setTimeout(() => handleNext(), 1800);
        } else {
            setScore(0);
            scoreRef.current = 0;

            if (name === 'timeout') {
                setMessage(`¡Tiempo! Era ${currentQuiz.target.name.toUpperCase()}`);
            } else {
                setMessage(`¡Incorrecto! Era ${currentQuiz.target.name.toUpperCase()}`);
            }

            const username = getLoggedUser();
            if (username) saveGameResult(username, false, 0);

            autoNextRef.current = setTimeout(() => handleNext(), 3000);
        }
    }, [stopAllTimers]);

    const handleNext = useCallback(async () => {
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

            fetchQuiz().then(q => { nextQuizRef.current = q; }).catch(() => { });
        } else {
            await initGame();
        }
    }, [stopAllTimers, startTimer, initGame]);

    useEffect(() => {
        const savedHigh = localStorage.getItem('pokeHighScore');
        if (savedHigh) {
            const val = parseInt(savedHigh);
            setHighScore(val);
            highScoreRef.current = val;
        }
        initGame();

        return () => {
            stopAllTimers();
        };
    }, [initGame, stopAllTimers]);

    return {
        quiz,
        revealed,
        score,
        highScore,
        loading,
        message,
        lastSelected,
        timeLeft,
        handleGuess,
        handleNext,
        initGame,
        startTimer,
    };
}
