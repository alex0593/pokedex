import { apiClient } from '../lib/apiClient';

export interface UserStats {
    total_answers: number;
    correct_answers: number;
    high_score: number;
    streak: number;
}

export interface Achievement {
    name: string;
    description: string;
    icon: string;
}

export interface UserProfile {
    id: number;
    username: string;
    avatar_url?: string;
    stats?: UserStats;
    achievements: Achievement[];
}

export async function login(username: string, password: string): Promise<string> {
    try {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: `Error ${response.status}` }));
            throw new Error(err.detail || 'Login failed');
        }

        const data = await response.json();
        localStorage.setItem('poke_token', data.access_token);
        localStorage.setItem('poke_user', username);
        return data.access_token;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === 'Failed to fetch') {
            throw new Error('No se pudo conectar con el servidor. ¿Está el backend encendido?');
        }
        throw error;
    }
}

export async function register(username: string, password: string): Promise<UserProfile> {
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: `Error ${response.status}` }));
            throw new Error(err.detail || 'Registration failed');
        }

        return await response.json();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === 'Failed to fetch') {
            throw new Error('Error de conexión al registrar. Verifica tu conexión o el estado del servidor.');
        }
        throw error;
    }
}

export async function getProfile(username: string): Promise<UserProfile> {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/profile?username=${username}`
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Error del servidor: ${response.status}`);
        }
        return await response.json();
    } catch (error: unknown) {
        console.error('Profile fetch error:', error);
        const message = error instanceof Error ? error.message : String(error);
        if (message === 'Failed to fetch') {
            throw new Error('No se pudo cargar el perfil: El servidor no responde.');
        }
        throw error;
    }
}

export async function saveGameResult(username: string, correct: boolean, score: number): Promise<unknown> {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/game/save-result?username=${username}&correct=${correct}&score=${score}`,
            { method: 'POST' }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Save result server error:', errorText);
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Save game result fetch failed:', error);
        throw error;
    }
}

export function logout(): void {
    localStorage.removeItem('poke_token');
    localStorage.removeItem('poke_user');
}

export function getLoggedUser(): string | null {
    return localStorage.getItem('poke_user');
}
