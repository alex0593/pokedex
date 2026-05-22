import React from 'react';
import { motion } from 'framer-motion';
import { AbilityDetail } from '../types/catalog';
import styles from './AbilityModal.module.css';
import { getSpanishEffect } from '../utils/translations';

interface AbilityModalProps {
    ability: AbilityDetail;
    onClose: () => void;
}

export const AbilityModal: React.FC<AbilityModalProps> = ({ ability, onClose }) => {
    const effectDesc = getSpanishEffect(ability.effect_entries);

    return (
        <div className={styles.overlay} onClick={onClose} role="presentation">
            <motion.div
                className={styles.modal}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="ability-modal-title"
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
                    <span className={styles.id}>#{ability.id?.toString().padStart(3, '0') || '???' }</span>
                    <h2 className={styles.name} id="ability-modal-title">{(ability.name || 'Sin nombre').replace('-', ' ')}</h2>
                    {ability.is_main_series && (
                        <span style={{ color: 'var(--accent-color)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Habilidad de Serie Principal</span>
                    )}
                </div>

                <h4 className={styles.sectionTitle}>Efecto Detallado</h4>
                <div className={styles.effectText}>
                    {effectDesc}
                </div>

                <h4 className={styles.sectionTitle}>Pokémon con esta habilidad</h4>
                <div className={styles.pokemonGrid}>
                    {ability.pokemon?.map(p => (
                        <div key={p.pokemon?.name || Math.random()} className={styles.pokemonItem}>
                            <span className={styles.pokemonName}>{(p.pokemon?.name || '').replace('-', ' ')}</span>
                            {p.is_hidden && <span className={styles.hiddenTag}>Oculta</span>}
                        </div>
                    ))}
                    {(ability.pokemon?.length === 0 || !ability.pokemon) && (
                        <p style={{ color: 'var(--text-secondary)' }}>Ningún Pokémon registrado con esta habilidad.</p>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
