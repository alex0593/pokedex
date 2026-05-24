'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  fetchPokemons,
  fetchPokemonDetail,
  fetchTypes,
  fetchRandomPokemon,
} from '../../services/pokemonService';
import { PokemonSummary, PokemonDetail } from '../../types/pokemon';
import { PokemonCard } from '../../components/PokemonCard';
import { PageLayout } from '../../components/PageLayout';
import { ToastContainer } from '../../components/Toast';
import { Skeleton } from '../../components/Skeleton';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useToast } from '../../hooks/useToast';
import { translate } from '../../utils/translations';
import { getTypeBgColor, getTypeTextColor } from '../../utils/typeColors';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import styles from './page.module.css';

const PokemonModal = dynamic(
  () => import('../../components/PokemonModal').then(mod => ({ default: mod.PokemonModal })),
  { ssr: false },
);

const LIMIT = 25;

export default function Pokedex() {
  const [pokemons, setPokemons] = useState<PokemonSummary[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const triggerRef = useRef<HTMLDivElement>(null);
  const { toasts, showError, dismiss } = useToast();
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();

  // Carga inicial de tipos
  useEffect(() => {
    fetchTypes()
      .then(setTypes)
      .catch(() => showError('No se pudieron cargar los tipos de Pokémon.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Búsqueda con debounce (400 ms) — reinicia a offset 0 en cada cambio de filtros
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchPokemons(LIMIT, 0, searchTerm, selectedTypes);
        setPokemons(data);
        setOffset(0);
      } catch {
        showError('No se pudieron cargar los Pokémon. Verifica tu conexión.');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedTypes]);

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setSearchTerm('');
  };

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextOffset = offset + LIMIT;
    try {
      const morePoke = await fetchPokemons(LIMIT, nextOffset, searchTerm, selectedTypes);
      setPokemons(prev => [...prev, ...morePoke]);
      setOffset(nextOffset);
    } catch {
      showError('Error al cargar más Pokémon.');
    } finally {
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, loadingMore, searchTerm, selectedTypes]);

  useInfiniteScroll(triggerRef, { loading, loadingMore, onLoadMore: loadMore });

  const openDetail = async (id: string | number) => {
    try {
      const detail = await fetchPokemonDetail(id);
      setSelectedPokemon(detail);
      setIsModalOpen(true);
    } catch {
      showError('No se pudo cargar el detalle del Pokémon.');
    }
  };

  const openRandom = async () => {
    setLoading(true);
    try {
      const random = await fetchRandomPokemon();
      setSelectedPokemon(random);
      setIsModalOpen(true);
    } catch {
      showError('No se pudo cargar un Pokémon aleatorio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.mainContainer}>
      <PageLayout>
        {/* BÚSQUEDA Y FILTROS */}
        <section className={styles.controls}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Buscar por nombre (ej: Pikachu, Bulbasaur...)"
              className={styles.searchInput}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label="Buscar Pokémon"
            />
            <button
              className={styles.randomBtn}
              onClick={openRandom}
              title="Pokémon aleatorio"
              aria-label="Pokémon aleatorio"
              type="button"
            >
              🎲
            </button>
          </div>

          <div className={styles.filterSection}>
            <div className={styles.filterHeader}>
              <button
                className={styles.filterToggle}
                onClick={() => setFiltersOpen(v => !v)}
                type="button"
                aria-expanded={filtersOpen}
              >
                <span className={styles.filterLabel}>
                  Filtros
                  {selectedTypes.length > 0 && (
                    <span className={styles.filterCount}>{selectedTypes.length}</span>
                  )}
                </span>
                <span className={`${styles.filterArrow} ${filtersOpen ? styles.filterArrowOpen : ''}`}>▾</span>
              </button>
              {(selectedTypes.length > 0 || searchTerm) && (
                <button
                  onClick={clearFilters}
                  className={styles.clearBtn}
                  type="button"
                >
                  BORRAR TODO
                </button>
              )}
            </div>

            {filtersOpen && (
              <div className={styles.chipsContainer}>
                {types.map(type => {
                  const active = selectedTypes.includes(type);
                  return (
                    <button
                      key={type}
                      className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                      onClick={() => toggleType(type)}
                      style={
                        active
                          ? { backgroundColor: getTypeBgColor(type), borderColor: getTypeBgColor(type), color: '#fff' }
                          : { borderColor: getTypeTextColor(type), color: getTypeTextColor(type) }
                      }
                      type="button"
                    >
                      {translate(type, 'types')}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {loading ? (
          <div className={styles.pokemonGrid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <Skeleton height={150} borderRadius="15px 15px 0 0" />
                <div style={{ padding: '15px' }}>
                  <Skeleton height={20} width="60%" />
                  <Skeleton height={15} width="40%" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.pokemonGrid}>
            {pokemons.length > 0 ? (
              pokemons.map((pokemon, index) => (
                <motion.div
                  key={pokemon.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                >
                  <PokemonCard
                    pokemon={pokemon}
                    onClick={openDetail}
                    isFavorite={user ? isFavorite('pokemon', pokemon.name.toLowerCase()) : undefined}
                    onToggleFavorite={user ? () => toggle('pokemon', pokemon.name.toLowerCase(), pokemon.id) : undefined}
                  />
                </motion.div>
              ))
            ) : (
              <div className={styles.noResults}>
                <h2>Sin resultados para tu búsqueda</h2>
                <p>Prueba con otro nombre o limpia los filtros.</p>
                <button className={styles.loadMoreBtn} onClick={clearFilters} style={{ marginTop: '20px' }} type="button">
                  Quitar filtros
                </button>
              </div>
            )}
          </div>
        )}

        {/* Trigger de scroll infinito */}
        <div ref={triggerRef} className={styles.loadMoreContainer}>
          {loadingMore && (
            <div className={styles.pokemonGrid} style={{ width: '100%', marginTop: '20px' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <Skeleton height={150} borderRadius="15px 15px 0 0" />
                  <div style={{ padding: '15px' }}>
                    <Skeleton height={20} width="60%" />
                    <Skeleton height={15} width="40%" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {isModalOpen && selectedPokemon && (
            <PokemonModal pokemon={selectedPokemon} onClose={() => setIsModalOpen(false)} />
          )}
        </AnimatePresence>
      </PageLayout>

      <ToastContainer messages={toasts} onDismiss={dismiss} />
    </main>
  );
}
