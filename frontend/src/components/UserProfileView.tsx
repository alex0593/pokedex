'use client';

import React, { useEffect, useState } from 'react';
import { getProfile, UserProfile } from '../services/authService';
import styles from './UserProfileView.module.css';

interface UserProfileViewProps {
    username: string;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ username }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getProfile(username);
                setProfile(data);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Error al cargar el perfil");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [username]);

    if (loading) return <div className={styles.container}>Analizando expediente del entrenador...</div>;

    if (error || !profile) {
        return (
            <div className={styles.container} style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
                <h2 style={{ color: 'var(--primary-color)' }}>Error de Conexión</h2>
                <p style={{ margin: '15px 0', opacity: 0.8 }}>{error || "No se pudo cargar el perfil."}</p>
                <div style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    padding: '15px', 
                    borderRadius: '10px', 
                    fontSize: '0.9rem',
                    border: '1px solid rgba(255,255,255,0.1)' 
                }}>
                    <strong>Sugerencia:</strong> Asegúrate de que el servidor (Python/Uvicorn) esté encendido en el puerto 8000.
                </div>
                <button onClick={() => window.location.reload()} style={{
                    marginTop: '20px',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    border: 'none',
                    background: 'var(--primary-color)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer'
                }}>
                    Reintentar Conexión
                </button>
            </div>
        );
    }

    const stats = profile.stats || { total_answers: 0, correct_answers: 0, high_score: 0, streak: 0 };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.avatar}>🧑‍🚀</div>
                <div className={styles.userInfo}>
                    <h2>{profile.username}</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Master Pokemon Trainer</p>
                </div>
            </header>

            <h3 className={styles.sectionTitle}>🏆 Estadísticas Generales</h3>
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statVal}>{stats.high_score}</span>
                    <span className={styles.statLabel}>Récord Trivia</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statVal}>{stats.correct_answers}</span>
                    <span className={styles.statLabel}>Aciertos Totales</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statVal}>{stats.streak}</span>
                    <span className={styles.statLabel}>Racha Actual</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statVal}>
                        {stats.total_answers > 0 ? ((stats.correct_answers / stats.total_answers) * 100).toFixed(0) : 0}%
                    </span>
                    <span className={styles.statLabel}>Precisión</span>
                </div>
            </div>

            <h3 className={styles.sectionTitle}>✨ Logros Desbloqueados</h3>
            <div className={styles.achievementsGrid}>
                {profile.achievements && profile.achievements.length > 0 ? (
                    profile.achievements.map((ach, idx) => (
                        <div key={idx} className={styles.achCard}>
                            <span className={styles.achIcon}>{ach.icon}</span>
                            <div className={styles.achInfo}>
                                <h4>{ach.name}</h4>
                                <p>{ach.description}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={styles.noAch}>Sigue jugando a la Trivia para desbloquear medallas y logros especiales.</div>
                )}
            </div>
        </div>
    );
};
