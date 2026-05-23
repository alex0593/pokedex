'use client';

import React from 'react';
import Link from 'next/link';
import { PageLayout } from '../../components/PageLayout';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useAuth } from '../../contexts/AuthContext';
import type { EntityType, FavoriteItem } from '../../services/favoritesService';
import styles from './favorites.module.css';

// ── Configuración de secciones ────────────────────────────────────────────────

const SECTIONS: { type: EntityType; label: string; icon: string; href: string }[] = [
  { type: 'pokemon', label: 'Pokémon', icon: '🐾', href: '/pokemon' },
  { type: 'move', label: 'Movimientos', icon: '⚡', href: '/moves' },
  { type: 'ability', label: 'Habilidades', icon: '✨', href: '/abilities' },
  { type: 'item', label: 'Objetos', icon: '🎒', href: '/items' },
  { type: 'berry', label: 'Bayas', icon: '🍒', href: '/berries' },
];

// ── Componente de tarjeta mínima ───────────────────────────────────────────────

function FavCard({ fav, onRemove }: { fav: FavoriteItem; onRemove: () => void }) {
  const displayName = fav.entity_name.replace(/-/g, ' ');

  return (
    <div className={styles.favCard}>
      <span className={styles.favName}>{displayName}</span>
      {fav.entity_id && (
        <span className={styles.favId}>#{fav.entity_id.toString().padStart(3, '0')}</span>
      )}
      <button
        type="button"
        className={styles.removeBtn}
        onClick={onRemove}
        aria-label={`Quitar ${displayName} de favoritos`}
        title="Quitar de favoritos"
      >
        ✕
      </button>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function FavoritesPage() {
  const { user } = useAuth();
  const { favoritesList, isLoading, toggle } = useFavorites();

  if (!user) {
    return (
      <main className={styles.main}>
        <PageLayout>
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔒</span>
            <h2>Inicia sesión para ver tus favoritos</h2>
            <p>
              Guarda tus Pokémon, movimientos, habilidades, objetos y bayas favoritas.
              Inicia sesión para comenzar.
            </p>
          </div>
        </PageLayout>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className={styles.main}>
        <PageLayout>
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Cargando favoritos…</p>
          </div>
        </PageLayout>
      </main>
    );
  }

  const grouped = SECTIONS.reduce<Record<EntityType, FavoriteItem[]>>(
    (acc, s) => {
      acc[s.type] = favoritesList.filter((f) => f.entity_type === s.type);
      return acc;
    },
    {} as Record<EntityType, FavoriteItem[]>,
  );

  const total = favoritesList.length;

  return (
    <main className={styles.main}>
      <PageLayout>
        <div className={styles.header}>
          <h1 className={styles.title}>
            ❤️ Mis Favoritos
          </h1>
          {total > 0 && (
            <span className={styles.totalBadge}>{total} guardado{total !== 1 ? 's' : ''}</span>
          )}
        </div>

        {total === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🤍</span>
            <h2>Aún no tienes favoritos</h2>
            <p>
              Haz clic en el corazón de cualquier carta para guardar tu colección.
            </p>
            <Link href="/pokemon" className={styles.ctaLink}>
              Explorar Pokémon →
            </Link>
          </div>
        ) : (
          <div className={styles.sections}>
            {SECTIONS.map(({ type, label, icon, href }) => {
              const items = grouped[type];
              if (items.length === 0) return null;
              return (
                <section key={type} className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionIcon}>{icon}</span>
                    <h2 className={styles.sectionTitle}>{label}</h2>
                    <span className={styles.sectionCount}>{items.length}</span>
                    <Link href={href} className={styles.sectionLink}>
                      Ver todos →
                    </Link>
                  </div>
                  <div className={styles.grid}>
                    {items.map((fav) => (
                      <FavCard
                        key={`${fav.entity_type}:${fav.entity_name}`}
                        fav={fav}
                        onRemove={() => toggle(fav.entity_type, fav.entity_name, fav.entity_id)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </PageLayout>
    </main>
  );
}
