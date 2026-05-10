import React from 'react';
import { MoveDetail } from '../types/catalog';
import styles from './MoveCard.module.css';
import { translate } from '../utils/translations';

interface MoveCardProps {
  move: MoveDetail;
  onClick: (name: string) => void;
}

export function MoveCard({ move, onClick }: MoveCardProps) {
  // Simple type color mapping
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

  if (!move) return null;

  return (
    <div className={styles.card} onClick={() => onClick(move.name || '')}>
      <span className={styles.idBadge}>#{move.id?.toString().padStart(3, '0') || '???' }</span>
      
      <h3 className={styles.name}>{(move.name || 'Sin nombre').replace('-', ' ')}</h3>
      
      <div className={styles.typeContainer}>
        <span className={styles.typeBadge} style={{ backgroundColor: getTypeColor(move.type?.name || 'normal') }}>
          {translate(move.type?.name || '', 'types')}
        </span>
        <span className={styles.typeBadge} style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {translate(move.damage_class?.name || '', 'damage_classes')}
        </span>
      </div>
      
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Poder</span>
          <span className={styles.statValue}>{move.power ?? '--'}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Precisión</span>
          <span className={styles.statValue}>{move.accuracy ?? '--'}%</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>PP</span>
          <span className={styles.statValue}>{move.pp ?? '--'}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Clase</span>
          <span className={styles.statValue} style={{ fontSize: '0.7rem' }}>
            {translate(move.damage_class?.name || '', 'damage_classes')}
          </span>
        </div>
      </div>
    </div>
  );
}
