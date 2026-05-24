"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { login, logout as logoutService, getLoggedUser } from '../services/authService';

interface AuthContextType {
    user: string | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize from localStorage on mount
    useEffect(() => {
        const storedUser = getLoggedUser();
        setUser(storedUser);
        setIsLoading(false);

        // Listen for storage changes (login/logout in other tabs)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'poke_user') {
                setUser(e.newValue);
            }
        };

        // 401 global → la sesión expiró o el usuario ya no existe en el backend.
        // Limpiamos localStorage automáticamente para evitar el estado incoherente
        // en que el front cree que hay sesión pero el backend la rechaza.
        const handleUnauthorized = () => {
            logoutService();
            setUser(null);
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('auth:unauthorized', handleUnauthorized);
        };
    }, []);

    const handleLogin = async (username: string, password: string) => {
        setIsLoading(true);
        try {
            await login(username, password);
            setUser(username);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        logoutService();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login: handleLogin, logout: handleLogout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
