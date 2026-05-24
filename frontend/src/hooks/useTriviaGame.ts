import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchQuiz } from '../services/pokemonService';
import { saveGameResult, getLoggedUser, saveStageAnswer, getLoggedToken } from '../services/authService';
import { PokemonDetail } from '../types/pokemon';
import type { StageAnswerResult } from '../types/game';

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
    // Inicializar desde localStorage en el primer render (lazy init evita el effect impuro)
    const [highScore, setHighScore] = useState<number>(() => {
        if (typeof window === 'undefined') return 0;
        const saved = localStorage.getItem('pokeHighScore');
        return saved ? parseInt(saved, 10) : 0;
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('¿Quién es este Pokémon?');
    const [lastSelected, setLastSelected] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(10);

    // Refs for stable latest values (avoid stale closures)
    const quizRef = useRef<QuizData | null>(null);
    const nextQuizRef = useRef<QuizData | null>(null);
    const revealedRef = useRef(false);
    const scoreRef = useRef(0);
    // highScoreRef se sincroniza con el estado; el valor inicial se carga desde useState
    const highScoreRef = useRef(highScore);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const autoNextRef = useRef<NodeJS.Timeout | null>(null);

    // Refs to break the circular useCallback dependency chain:
    // startTimer → handleGuess → handleNext → initGame → startTimer
    const handleGuessRef = useRef<((name: string) => void) | null>(null);
    const handleNextRef = useRef<(() => Promise<void>) | null>(null);

    useEffect(() => { quizRef.current = quiz; }, [quiz]);
    useEffect(() => { revealedRef.current = revealed; }, [revealed]);
    useEffect(() => { scoreRef.current = score; }, [score]);
    useEffect(() => { highScoreRef.current = highScore; }, [highScore]);

    const stopAllTimers = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (autoNextRef.current) { clearTimeout(autoNextRef.current); autoNextRef.current = null; }
    }, []);

    // startTimer calls handleGuessRef (not handleGuess directly) to avoid circular dep
    const startTimer = useCallback(() => {
        stopAllTimers();
        setTimeLeft(10);

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0.1) {
                    clearInterval(timerRef.current!);
                    timerRef.current = null;
                    if (!revealedRef.current) {
                        handleGuessRef.current?.('timeout');
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

    // handleGuess calls handleNextRef (not handleNext directly) to avoid circular dep
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

            autoNextRef.current = setTimeout(() => handleNextRef.current?.(), 1800);
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

            autoNextRef.current = setTimeout(() => handleNextRef.current?.(), 3000);
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

    // Keep circular refs up to date after each render
    useEffect(() => { handleGuessRef.current = handleGuess; });
    useEffect(() => { handleNextRef.current = handleNext; });

    useEffect(() => {
        initGame(); // eslint-disable-line react-hooks/set-state-in-effect -- patrón correcto de inicialización async
        return () => { stopAllTimers(); };
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

// ══════════════════════════════════════════════════════════════════
// useStageGame — Hook para el modo Aventura por Regiones
// Fija 10 preguntas por intento, filtra por región + tipo y guarda
// resultados en /game/stage/answer (JWT requerido).
// ══════════════════════════════════════════════════════════════════

const STAGE_QUESTIONS = 10;
const STAGE_PASS_THRESHOLD = 7;

interface StageGameState {
    quiz: QuizData | null;
    revealed: boolean;
    questionNumber: number;    // 1–10 durante el intento, 0 = no iniciado
    correctCount: number;
    loading: boolean;
    message: string;
    lastSelected: string | null;
    timeLeft: number;
    finished: boolean;         // true cuando se completaron las 10 preguntas
    attemptPassed: boolean;    // si el último intento fue aprobado
    regionCompleted: boolean;  // si la región entera quedó conquistada
    newAchievements: string[]; // logros nuevos ganados
}

interface StageGameActions {
    handleGuess: (name: string) => void;
    handleNext: () => Promise<void>;
    initStage: () => Promise<void>;
}

export function useStageGame(
    region: string,
    typeName: string,
): StageGameState & StageGameActions {
    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [revealed, setRevealed] = useState(false);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('¿Quién es este Pokémon?');
    const [lastSelected, setLastSelected] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(10);
    const [finished, setFinished] = useState(false);
    const [attemptPassed, setAttemptPassed] = useState(false);
    const [regionCompleted, setRegionCompleted] = useState(false);
    const [newAchievements, setNewAchievements] = useState<string[]>([]);

    // Refs
    const quizRef        = useRef<QuizData | null>(null);
    const revealedRef    = useRef(false);
    const questionNumRef = useRef(0);
    const correctRef     = useRef(0);
    const timerRef       = useRef<NodeJS.Timeout | null>(null);
    const autoNextRef    = useRef<NodeJS.Timeout | null>(null);
    const handleGuessRef = useRef<((name: string) => void) | null>(null);
    const handleNextRef  = useRef<(() => Promise<void>) | null>(null);
    const apiResultRef   = useRef<StageAnswerResult | null>(null);

    useEffect(() => { quizRef.current = quiz; }, [quiz]);
    useEffect(() => { revealedRef.current = revealed; }, [revealed]);
    useEffect(() => { questionNumRef.current = questionNumber; }, [questionNumber]);
    useEffect(() => { correctRef.current = correctCount; }, [correctCount]);

    const stopAllTimers = useCallback(() => {
        if (timerRef.current)    { clearInterval(timerRef.current); timerRef.current = null; }
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
                    if (!revealedRef.current) handleGuessRef.current?.('timeout');
                    return 0;
                }
                return parseFloat((prev - 0.1).toFixed(2));
            });
        }, 100);
    }, [stopAllTimers]);

    const initStage = useCallback(async () => {
        setLoading(true);
        setFinished(false);
        setAttemptPassed(false);
        setRegionCompleted(false);
        setNewAchievements([]);
        setQuestionNumber(0);
        setCorrectCount(0);
        correctRef.current = 0;
        questionNumRef.current = 0;
        apiResultRef.current = null;
        stopAllTimers();

        try {
            const q = await fetchQuiz({ region, type: typeName });
            setQuiz(q);
            quizRef.current = q;
            setRevealed(false);
            revealedRef.current = false;
            setLastSelected(null);
            setMessage('¿Quién es este Pokémon?');
            setQuestionNumber(1);
            questionNumRef.current = 1;
            setLoading(false);
            startTimer();
        } catch {
            setLoading(false);
        }
    }, [region, typeName, stopAllTimers, startTimer]);

    const handleGuess = useCallback((name: string) => {
        if (revealedRef.current) return;
        if (!quizRef.current) return;

        stopAllTimers();
        setRevealed(true);
        revealedRef.current = true;
        setLastSelected(name);

        const isCorrect = name === quizRef.current.target.name;
        const isLast    = questionNumRef.current >= STAGE_QUESTIONS;

        if (isCorrect) {
            const newCorrect = correctRef.current + 1;
            setCorrectCount(newCorrect);
            correctRef.current = newCorrect;
            setMessage(`¡Excelente! Es ${quizRef.current.target.name.toUpperCase()}`);
        } else {
            setMessage(
                name === 'timeout'
                    ? `¡Tiempo! Era ${quizRef.current.target.name.toUpperCase()}`
                    : `¡Incorrecto! Era ${quizRef.current.target.name.toUpperCase()}`,
            );
        }

        // Enviar al backend (fire-and-forget, guardar resultado en la última pregunta)
        const token = getLoggedToken();
        if (token) {
            saveStageAnswer(token, region, typeName, isCorrect)
                .then(res => { if (isLast) apiResultRef.current = res; })
                .catch(() => { });
        }

        const delay = isCorrect ? 1800 : 3000;
        autoNextRef.current = setTimeout(() => handleNextRef.current?.(), delay);
    }, [stopAllTimers, region, typeName]);

    const handleNext = useCallback(async () => {
        stopAllTimers();

        if (questionNumRef.current >= STAGE_QUESTIONS) {
            // Intento completo — mostrar resultado
            const res = apiResultRef.current;
            const passed = res
                ? res.attempt_passed
                : correctRef.current >= STAGE_PASS_THRESHOLD;
            setAttemptPassed(passed);
            setRegionCompleted(res?.region_completed ?? false);
            setNewAchievements(res?.new_achievements ?? []);
            setFinished(true);
            return;
        }

        // Cargar siguiente pregunta
        try {
            const q = await fetchQuiz({ region, type: typeName });
            setQuiz(q);
            quizRef.current = q;
            setRevealed(false);
            revealedRef.current = false;
            setLastSelected(null);
            setMessage('¿Quién es este Pokémon?');
            setQuestionNumber(prev => {
                const n = prev + 1;
                questionNumRef.current = n;
                return n;
            });
            startTimer();
        } catch {
            // Si falla la carga, igual avanzar al resultado
            setFinished(true);
        }
    }, [stopAllTimers, region, typeName, startTimer]);

    // Mantener refs circulares actualizadas
    useEffect(() => { handleGuessRef.current = handleGuess; });
    useEffect(() => { handleNextRef.current = handleNext; });

    // Iniciar el stage al montar
    useEffect(() => {
        initStage(); // eslint-disable-line react-hooks/set-state-in-effect -- patrón de inicialización async, igual que useTriviaGame
        return () => { stopAllTimers(); };
    }, [initStage, stopAllTimers]);

    return {
        quiz, revealed, questionNumber, correctCount,
        loading, message, lastSelected, timeLeft,
        finished, attemptPassed, regionCompleted, newAchievements,
        handleGuess, handleNext, initStage,
    };
}
