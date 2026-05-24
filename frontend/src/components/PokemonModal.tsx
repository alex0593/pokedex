'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { PokemonDetail } from '../types/pokemon';
import styles from './PokemonModal.module.css';
import { translate } from '../utils/translations';
import { getTypeBgColor } from '../utils/typeColors';

interface PokemonModalProps {
    pokemon: PokemonDetail;
    onClose: () => void;
}

type Tab = 'stats' | 'sprites';

/** Devuelve un color (hsl) para la barra de stat según el valor: rojo→amarillo→verde. */
function statColor(value: number): string {
    if (value < 50)  return '#ef4444'; // rojo
    if (value < 80)  return '#f59e0b'; // ámbar
    if (value < 100) return '#84cc16'; // lima
    return '#22c55e';                   // verde
}

/** Colección de sprites disponibles para la galería. */
function buildSprites(pokemon: PokemonDetail): { label: string; url: string }[] {
    const map: [string, string][] = [
        ['Official Art',  pokemon.sprites.official_artwork],
        ['Home',          pokemon.sprites.home],
        ['Dream World',   pokemon.sprites.dream_world],
        ['Normal',        pokemon.sprites.front_default],
        ['Espalda',       pokemon.sprites.back_default],
        ['Shiny',         pokemon.sprites.front_shiny],
    ];
    return map
        .filter(([, url]) => !!url)
        .map(([label, url]) => ({ label, url }));
}

export const PokemonModal: React.FC<PokemonModalProps> = ({ pokemon, onClose }) => {
    const [activeTab, setActiveTab] = useState<Tab>('stats');
    const maxStat = 255;

    const primaryType = pokemon.types[0] ?? 'normal';
    const primaryColor = getTypeBgColor(primaryType);

    // Cierra con ESC
    const handleKey = useCallback(
        (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
        [onClose],
    );
    useEffect(() => {
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [handleKey]);

    const totalStats = pokemon.stats.reduce((acc, s) => acc + s.base_stat, 0);
    const sprites = buildSprites(pokemon);

    return (
        <div
            className={styles.overlay}
            onClick={onClose}
            role="presentation"
        >
            <motion.div
                className={styles.modal}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="pokemon-modal-title"
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

                {/* ── Columna izquierda: imagen + badges ── */}
                <div
                    className={styles.leftCol}
                    style={{
                        background: `linear-gradient(160deg, ${primaryColor}33 0%, ${primaryColor}11 60%, transparent 100%)`,
                        borderRight: `1px solid ${primaryColor}44`,
                    }}
                >
                    <Image
                        src={pokemon.sprites.official_artwork || pokemon.image}
                        alt={pokemon.name}
                        className={styles.pokemonImage}
                        width={220}
                        height={220}
                        priority
                    />

                    {/* Badges de tipo */}
                    <div className={styles.typeBadges}>
                        {pokemon.types.map(type => (
                            <span
                                key={type}
                                className={styles.typeBadge}
                                style={{
                                    background: getTypeBgColor(type),
                                    color: '#fff',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                }}
                            >
                                {translate(type, 'types')}
                            </span>
                        ))}
                    </div>
                </div>

                {/* ── Columna derecha: info + tabs ── */}
                <div className={styles.rightCol}>
                    <div className={styles.header}>
                        <span className={styles.pokemonId}>
                            #{pokemon.id.toString().padStart(3, '0')}
                        </span>
                        <h2 className={styles.name} id="pokemon-modal-title">
                            {pokemon.name}
                        </h2>
                    </div>

                    {/* Tabs */}
                    <div className={styles.tabs} role="tablist">
                        {(['stats', 'sprites'] as Tab[]).map(tab => (
                            <button
                                key={tab}
                                role="tab"
                                aria-selected={activeTab === tab}
                                className={`${styles.tabBtn} ${activeTab === tab ? styles.tabActive : ''}`}
                                onClick={() => setActiveTab(tab)}
                                type="button"
                                style={activeTab === tab ? { borderColor: primaryColor, color: primaryColor } : {}}
                            >
                                {tab === 'stats' ? '📊 Stats' : '🖼️ Sprites'}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'stats' && (
                            <motion.div
                                key="stats"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className={styles.statsSection}>
                                    <h4 className={styles.sectionTitle}>ESTADÍSTICAS BASE</h4>
                                    {pokemon.stats.map(s => (
                                        <div key={s.name} className={styles.statRow}>
                                            <div className={styles.statInfo}>
                                                <span>{translate(s.name, 'stats')}</span>
                                                <span style={{ color: statColor(s.base_stat), fontWeight: 800 }}>
                                                    {s.base_stat}
                                                </span>
                                            </div>
                                            <div className={styles.statBarContainer}>
                                                <motion.div
                                                    className={styles.statBarFill}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(s.base_stat / maxStat) * 100}%` }}
                                                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                                                    style={{ background: statColor(s.base_stat) }}
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    {/* Total */}
                                    <div className={styles.totalRow}>
                                        <span>TOTAL</span>
                                        <span style={{ color: primaryColor }}>{totalStats}</span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className={styles.sectionTitle}>HABILIDADES</h4>
                                    <div className={styles.abilities}>
                                        {pokemon.abilities.map(abilityName => (
                                            <span key={abilityName} className={styles.abilityBadge}>
                                                {abilityName.replace(/-/g, ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'sprites' && (
                            <motion.div
                                key="sprites"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <h4 className={styles.sectionTitle}>GALERÍA DE SPRITES</h4>
                                <div className={styles.spritesGrid}>
                                    {sprites.map(({ label, url }) => (
                                        <div key={label} className={styles.spriteCard}>
                                            <Image
                                                src={url}
                                                alt={`${pokemon.name} — ${label}`}
                                                width={80}
                                                height={80}
                                                className={styles.spriteImg}
                                            />
                                            <span className={styles.spriteLabel}>{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
