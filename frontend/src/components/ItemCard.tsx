import React from 'react';
import Image from 'next/image';
import { ItemDetail } from '../types/catalog';
import styles from './ItemCard.module.css';
import { translate, getSpanishEffect } from '../utils/translations';
import { FavoriteButton } from './FavoriteButton';

interface ItemCardProps {
  item: ItemDetail;
  onClick: (name: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

export function ItemCard({ item, onClick, isFavorite, onToggleFavorite }: ItemCardProps) {
  const effectDesc = getSpanishEffect(item.effect_entries);

  return (
    <div className={styles.card} onClick={() => onClick(item.name || '')}>
      {onToggleFavorite && (
        <FavoriteButton isFavorite={!!isFavorite} onToggle={onToggleFavorite} />
      )}
      <span className={styles.idBadge}>#{item.id?.toString().padStart(3, '0') || '???' }</span>

      <div className={styles.imageContainer}>
        {item.sprites?.default ? (
          <Image
            src={item.sprites.default}
            alt={item.name}
            className={styles.image}
            width={80}
            height={80}
          />
        ) : (
          <div className={styles.placeholder}>🎒</div>
        )}
      </div>

      <h3 className={styles.name}>{(item.name || 'Sin nombre').replace('-', ' ')}</h3>

      <div className={styles.categoryBadge}>
        {translate(item.category?.name, 'categories')}
      </div>

      <p className={styles.effect}>{effectDesc}</p>

      <div className={styles.footer}>
        <span className={styles.cost}>₽ {item.cost > 0 ? item.cost : 'No a la venta'}</span>
      </div>
    </div>
  );
}
