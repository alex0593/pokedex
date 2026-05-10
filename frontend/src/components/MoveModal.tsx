import React from 'react';
import { MoveDetail } from '../types/catalog';
import styles from './MoveModal.module.css';
import { translate, getSpanishEffect } from '../utils/translations';

interface MoveModalProps {
    move: MoveDetail;
    onClose: () => void;
}

export const MoveModal: React.FC<MoveModalProps> = ({ move, onClose }) => {
    const effectDesc = getSpanishEffect(move.effect_entries);

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            normal: '#A8A878', fire: '#F08030', water: '#6890F0', grass: '#78C850',
            electric: '#F8D030', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
            ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
            rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', steel: '#B8B8D0',
            fairy: '#EE99AC', dark: '#705848'
        };
        return colors[type] || '#A8A878';
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>&times;</button>

                <div className={styles.header}>
                    <div className={styles.nameContainer}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>#{move.id?.toString().padStart(3, '0') || '???' }</span>
                        <h2 className={styles.name}>{(move.name || 'Sin nombre').replace('-', ' ')}</h2>
                        <div>
                            <span className={styles.typeBadge} style={{ backgroundColor: getTypeColor(move.type?.name || 'normal') }}>
                                {translate(move.type?.name || '', 'types')}
                            </span>
                            <span className={styles.typeBadge} style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {translate(move.damage_class?.name || '', 'damage_classes')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles.infoSection}>
                    <div className={styles.statsGrid}>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Potencia</span>
                            <span className={styles.statValue}>{move.power || '--'}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Precisión</span>
                            <span className={styles.statValue}>{move.accuracy ? `${move.accuracy}%` : '--'}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>PP</span>
                            <span className={styles.statValue}>{move.pp}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Objetivo</span>
                            <span className={styles.statValue} style={{ fontSize: '0.9rem' }}>{translate(move.target?.name || '', 'targets')}</span>
                        </div>
                    </div>

                    <div className={styles.effectBox}>
                        <h4 className={styles.sectionTitle}>Efecto</h4>
                        <p className={styles.effectText}>{effectDesc}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
