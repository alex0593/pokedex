'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchPokemons,
  fetchPokemonDetail,
  fetchTypes,
  fetchRandomPokemon,
} from '../../services/pokemonService';
import { getLoggedUser, logout } from '../../services/authService';
import { PokemonSummary, PokemonDetail } from '../../types/pokemon';
import { PokemonCard } from '../../components/PokemonCard';
import { PokemonModal } from '../../components/PokemonModal';
import { AuthModal } from '../../components/AuthModal';
import styles from './page.module.css';
import { MiniNav } from '../../components/MiniNav';
import { Skeleton } from '../../components/Skeleton';

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

  // Auth State
  const [user, setUser] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    setUser(getLoggedUser());

    async function getTypes() {
      try {
        const typesData = await fetchTypes();
        setTypes(typesData);
      } catch (e) {
        console.error("Failed to load types", e);
      }
    }
    getTypes();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchPokemons(LIMIT, 0, searchTerm, selectedTypes);
        setPokemons(data);
        setOffset(0);
      } catch (error) {
        console.error("Fetch failed", error);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedTypes]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const toggleType = (type: string) => {
    const updatedTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    setSelectedTypes(updatedTypes);
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
    } catch (error) {
      console.error("Load more failed", error);
    } finally {
      setLoadingMore(false);
    }
  }, [offset, loadingMore, searchTerm, selectedTypes]);

  const openDetail = async (id: string | number) => {
    try {
      const detail = await fetchPokemonDetail(id);
      setSelectedPokemon(detail);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Fetch detail failed", error);
    }
  };

  // INFINITE SCROLL OBSERVER
  useEffect(() => {
    if (loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const target = document.querySelector('#infiniteScrollTrigger');
    if (target) observer.observe(target);

    return () => observer.disconnect();
  }, [loading, loadingMore, loadMore]);

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return (
    <main className={styles.mainContainer}>
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <h1 className={styles.title}>POKEDEX PRO MAX</h1>
          {user ? (
            <div className={styles.userStatus}>
              <span className={styles.userName}>Hola, {user}</span>
              <button onClick={handleLogout} className={styles.logoutBtn}>Cerrar Sesión</button>
            </div>
          ) : (
            <button onClick={() => setShowAuth(true)} className={styles.loginBtn}>Entrar</button>
          )}
        </div>
        
        <MiniNav />
      </header>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={(uname) => {
            setUser(uname);
            setShowAuth(false);
          }}
        />
      )}

      <>
        {/* SEARCH AND FILTERS */}
        <section className={styles.controls}>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                placeholder="Search by name (e.g. Pikachu, Bulba...)"
                className={styles.searchInput}
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <button
                className={styles.randomBtn}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const random = await fetchRandomPokemon();
                    setSelectedPokemon(random);
                    setIsModalOpen(true);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setLoading(false);
                  }
                }}
                title="Sorpéndeme"
              >
                🎲
              </button>
            </div>

            <div className={styles.filterSection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className={styles.filterLabel}>Filters</span>
                {(selectedTypes.length > 0 || searchTerm) && (
                  <button
                    onClick={clearFilters}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                  >
                    CLEAR ALL
                  </button>
                )}
              </div>

              <div className={styles.chipsContainer}>
                {types.map(type => (
                  <button
                    key={type}
                    className={`${styles.chip} ${selectedTypes.includes(type) ? styles.chipActive : ''}`}
                    onClick={() => toggleType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
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
                pokemons.map(pokemon => (
                  <PokemonCard
                    key={pokemon.id}
                    pokemon={pokemon}
                    onClick={openDetail}
                  />
                ))
              ) : (
                <div className={styles.noResults}>
                  <h2>No results match your criteria</h2>
                  <p>Try searching for something else or clearing filters.</p>
                  <button className={styles.btn} onClick={clearFilters} style={{ marginTop: '20px' }}>Reset Filters</button>
                </div>
              )}
            </div>
          )}

          <div id="infiniteScrollTrigger" className={styles.loadMoreContainer}>
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
            {!loadingMore && pokemons.length > 0 && pokemons.length % LIMIT === 0 && (
              <button
                className={styles.loadMoreBtn}
                onClick={loadMore}
                style={{ opacity: 0.5, fontSize: '0.7rem' }}
              >
                Cargando más resultados...
              </button>
            )}
          </div>
        </>

      {isModalOpen && selectedPokemon && (
        <PokemonModal
          pokemon={selectedPokemon}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      <footer className={styles.footer}>
        <p>&copy; 2026 POKEDEX &bull; PRO MAX</p>
      </footer>
    </main>
  );
}
