import React from 'react';
import Image from 'next/image';
import { PokemonSummary } from '../types/pokemon';
import styles from './PokemonCard.module.css';
import { translate } from '../utils/translations';
import { FavoriteButton } from './FavoriteButton';

interface PokemonCardProps {
    pokemon: PokemonSummary;
    onClick: (nameOrId: string | number) => void;
    isFavorite?: boolean;
    onToggleFavorite?: (e: React.MouseEvent) => void;
    /** Índice en el grid — los primeros N se cargan con priority para LCP */
    index?: number;
}

export const PokemonCard: React.FC<PokemonCardProps> = ({
    pokemon,
    onClick,
    isFavorite,
    onToggleFavorite,
    index = 99,
}) => {
    const mainType = pokemon.types[0];
    // Los primeros 8 cards son above-the-fold → priority=true genera <link rel="preload">
    const isPriority = index < 8;

    return (
        <div
            className={styles.card}
            data-type={mainType}
            onClick={() => onClick(pokemon.id)}
        >
            {onToggleFavorite && (
                <FavoriteButton
                    isFavorite={!!isFavorite}
                    onToggle={onToggleFavorite}
                />
            )}
            <div className={styles.idBadge}>#{pokemon.id.toString().padStart(3, '0')}</div>
            <div className={styles.imageContainer}>
                <Image
                    src={pokemon.image}
                    alt={pokemon.name}
                    className={styles.image}
                    width={120}
                    height={120}
                    unoptimized={pokemon.image.endsWith('.gif')}
                    priority={isPriority}
                    loading={isPriority ? 'eager' : 'lazy'}
                />
            </div>
            <h3 className={styles.name}>{pokemon.name}</h3>
            <div className={styles.typesContainer}>
                {pokemon.types.map(type => (
                    <span key={type} className={styles.typeBadge}>
                        {translate(type, 'types')}
                    </span>
                ))}
            </div>
        </div>
    );
};
