import React from 'react';
import { PokemonDetail } from '../types/pokemon';
import styles from './PokemonModal.module.css';
import { translate } from '../utils/translations';

interface PokemonModalProps {
    pokemon: PokemonDetail;
    onClose: () => void;
}

export const PokemonModal: React.FC<PokemonModalProps> = ({ pokemon, onClose }) => {
    const maxStat = 255; // Common max value for base stats

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>&times;</button>

                <div className={styles.leftCol}>
                    <img
                        src={pokemon.sprites.official_artwork || pokemon.image}
                        alt={pokemon.name}
                        className={styles.pokemonImage}
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        {pokemon.types.map(type => (
                            <span key={type} className={styles.abilityBadge} style={{ color: 'var(--accent-color)' }}>
                                {translate(type, 'types')}
                            </span>
                        ))}
                    </div>
                </div>

                <div className={styles.rightCol}>
                    <div className={styles.header}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>#{pokemon.id.toString().padStart(3, '0')}</span>
                        <h2 className={styles.name}>{pokemon.name}</h2>
                    </div>

                    <div className={styles.statsSection}>
                        <h4 style={{ marginBottom: '15px' }}>ESTADÍSTICAS BASE</h4>
                        {pokemon.stats.map(s => (
                            <div key={s.name} className={styles.statRow}>
                                <div className={styles.statInfo}>
                                    <span>{translate(s.name, 'stats')}</span>
                                    <span>{s.base_stat}</span>
                                </div>
                                <div className={styles.statBarContainer}>
                                    <div
                                        className={styles.statBarFill}
                                        style={{ width: `${(s.base_stat / maxStat) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <h4 style={{ marginBottom: '15px' }}>HABILIDADES</h4>
                        <div className={styles.abilities}>
                            {pokemon.abilities.map(abilityName => (
                                <span key={abilityName} className={styles.abilityBadge}>
                                    {abilityName.replace('-', ' ')}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
