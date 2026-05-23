/**
 * FavoriteButton — Botón de corazón para marcar/desmarcar favoritos.
 *
 * Se posiciona en la esquina superior izquierda de su contenedor padre
 * (que debe tener `position: relative`). Aparece al hacer hover en la
 * tarjeta y siempre visible si ya es favorito.
 */
"use client";

import React from 'react';
import styles from './FavoriteButton.module.css';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: (e: React.MouseEvent) => void;
  className?: string;
}

export function FavoriteButton({ isFavorite, onToggle, className }: FavoriteButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${isFavorite ? styles.active : ''} ${className ?? ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(e);
      }}
      aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
      aria-pressed={isFavorite}
      title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
    >
      {isFavorite ? '❤️' : '🤍'}
    </button>
  );
}
