import React from 'react';
import { AbilityDetail } from '../types/catalog';
import styles from './AbilityCard.module.css';
import { getSpanishEffect } from '../utils/translations';

interface AbilityCardProps {
  ability: AbilityDetail;
  onClick: (name: string) => void;
}

export function AbilityCard({ ability, onClick }: AbilityCardProps) {
  const effectDesc = getSpanishEffect(ability.effect_entries);

  return (
    <div className={styles.card} onClick={() => onClick(ability.name || '')}>
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
