import React from 'react';
import Image from 'next/image';
import { PokemonSummary } from '../types/pokemon';
import styles from './PokemonCard.module.css';
import { translate } from '../utils/translations';

interface PokemonCardProps {
    pokemon: PokemonSummary;
    onClick: (nameOrId: string | number) => void;
}

export const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, onClick }) => {
    const mainType = pokemon.types[0];

    return (
        <div
            className={styles.card}
            data-type={mainType}
            onClick={() => onClick(pokemon.id)}
        >
            <div className={styles.idBadge}>#{pokemon.id.toString().padStart(3, '0')}</div>
            <div className={styles.imageContainer}>
                <Image
                    src={pokemon.image}
                    alt={pokemon.name}
                    className={styles.image}
                    width={120}
                    height={120}
                    unoptimized={pokemon.image.endsWith('.gif')}
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
