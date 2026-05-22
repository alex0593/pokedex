import React from 'react';
import { motion } from 'framer-motion';
import { MoveDetail } from '../types/catalog';
import styles from './MoveModal.module.css';
import { translate, getSpanishEffect } from '../utils/translations';
import { getTypeBgColor } from '../utils/typeColors';

interface MoveModalProps {
    move: MoveDetail;
    onClose: () => void;
}

export const MoveModal: React.FC<MoveModalProps> = ({ move, onClose }) => {
    const effectDesc = getSpanishEffect(move.effect_entries);

    return (
        <div className={styles.overlay} onClick={onClose} role="presentation">
            <motion.div
                className={styles.modal}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="move-modal-title"
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
                <button
                    className={styles.closeBtn}
                    onClick={onClose}
                    aria-label="Cerrar modal"
                    type="button"
                >
                    &times;
                </button>

                <div className={styles.header}>
                    <div className={styles.nameContainer}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>#{move.id?.toString().padStart(3, '0') || '???' }</span>
                        <h2 className={styles.name} id="move-modal-title">{(move.name || 'Sin nombre').replace('-', ' ')}</h2>
                        <div>
                            <span className={styles.typeBadge} style={{ backgroundColor: getTypeBgColor(move.type?.name || 'normal') }}>
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
            </motion.div>
        </div>
    );
};
