'use client';

import React, { useState } from 'react';
import { login, register } from '../services/authService';
import styles from './AuthModal.module.css';

interface AuthModalProps {
    onClose: () => void;
    onSuccess: (username: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                await login(username, password);
                onSuccess(username);
            } else {
                await register(username, password);
                // After register, auto-login
                await login(username, password);
                onSuccess(username);
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                <h2 className={styles.title}>{isLogin ? 'Entrenador, Logueate' : 'Nuevo Entrenador'}</h2>

                {error && <div style={{ color: '#ff3e3e', marginBottom: '15px', textAlign: 'center', fontSize: '0.9rem' }}>{error}</div>}

                <form className={styles.form} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label>Nombre de Usuario</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? 'Procesando...' : (isLogin ? 'Entrar al Hall' : 'Registrarse')}
                    </button>
                </form>

                <p className={styles.switchText}>
                    {isLogin ? '¿No tienes cuenta?' : '¿Ya eres miembro?'}
                    <button className={styles.switchBtn} onClick={() => setIsLogin(!isLogin)}>
                        {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
                    </button>
                </p>
            </div>
        </div>
    );
};
