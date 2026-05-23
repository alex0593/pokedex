import React from 'react';
import Image from 'next/image';
import { BerryDetail } from '../types/catalog';
import styles from './BerryCard.module.css';
import { translate } from '../utils/translations';
import { FavoriteButton } from './FavoriteButton';

interface BerryCardProps {
  berry: BerryDetail;
  onClick: (name: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

export function BerryCard({ berry, onClick, isFavorite, onToggleFavorite }: BerryCardProps) {
  const [imageError, setImageError] = React.useState(false);

  const imageUrl = berry.sprites?.default || '';

  return (
    <div className={styles.card} onClick={() => onClick(berry.name || '')}>
      {onToggleFavorite && (
        <FavoriteButton isFavorite={!!isFavorite} onToggle={onToggleFavorite} />
      )}
      <span className={styles.idBadge}>#{berry.id?.toString().padStart(3, '0') || '???' }</span>

      <div className={styles.imageContainer}>
        {!imageError ? (
          <Image
            src={imageUrl}
            alt={berry.name}
            className={styles.image}
            width={80}
            height={80}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={styles.placeholder}>🍒</div>
        )}
      </div>

      <h3 className={styles.name}>Baya {(berry.name || 'desconocida').replace('-', ' ')}</h3>

      <div className={styles.firmnessBadge}>
        {translate(berry.firmness?.name, 'firmness')}
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statColumn}>
          <span className={styles.statLabel}>Tiempo Crec.</span>
          <span className={styles.statValue}>{berry.growth_time}h</span>
        </div>
        <div className={styles.statColumn}>
          <span className={styles.statLabel}>Tamaño</span>
          <span className={styles.statValue}>{berry.size}mm</span>
        </div>
      </div>

      <div className={styles.statsRow} style={{ marginTop: '5px' }}>
        <div className={styles.statColumn}>
          <span className={styles.statLabel}>Máx Cosecha</span>
          <span className={styles.statValue}>{berry.max_harvest}</span>
        </div>
      </div>
    </div>
  );
}
