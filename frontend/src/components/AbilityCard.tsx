import React from 'react';
import { AbilityDetail } from '../types/catalog';
import styles from './AbilityCard.module.css';
import { getSpanishEffect } from '../utils/translations';
import { FavoriteButton } from './FavoriteButton';

interface AbilityCardProps {
  ability: AbilityDetail;
  onClick: (name: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

export function AbilityCard({ ability, onClick, isFavorite, onToggleFavorite }: AbilityCardProps) {
  const effectDesc = getSpanishEffect(ability.effect_entries);

  return (
    <div className={styles.card} onClick={() => onClick(ability.name || '')}>
      {onToggleFavorite && (
        <FavoriteButton isFavorite={!!isFavorite} onToggle={onToggleFavorite} />
      )}
      <span className={styles.idBadge}>#{ability.id?.toString().padStart(3, '0') || '???' }</span>

      <h3 className={styles.name}>{(ability.name || 'Sin nombre').replace('-', ' ')}</h3>

      <p className={styles.effect}>{effectDesc}</p>

      <div className={styles.footer}>
        <span className={styles.badge}>{ability.pokemon?.length || 0} Pokémon</span>
        {ability.is_main_series && <span className={styles.mainSeries}>Serie Principal</span>}
      </div>
    </div>
  );
}
