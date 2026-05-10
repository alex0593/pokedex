'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAbilities } from '../../services/catalogService';
import { AbilityDetail } from '../../types/catalog';
import { AbilityCard } from '../../components/AbilityCard';
import { AbilityModal } from '../../components/AbilityModal';
import { Skeleton } from '../../components/Skeleton';
import styles from '../berries/berries.module.css'; // Reusing berries styles for consistency
import { MiniNav } from '../../components/MiniNav';

const LIMIT = 25;

export default function AbilitiesCatalog() {
  const [abilities, setAbilities] = useState<AbilityDetail[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedAbility, setSelectedAbility] = useState<AbilityDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function getInitialAbilities() {
      setLoading(true);
      try {
        const data = await fetchAbilities(LIMIT, 0);
        setAbilities(data);
        setOffset(0);
      } catch (error) {
        console.error("Failed to fetch initial abilities", error);
      } finally {
        setLoading(false);
      }
    }
    getInitialAbilities();
  }, []);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextOffset = offset + LIMIT;
    try {
      const moreAbilities = await fetchAbilities(LIMIT, nextOffset);
      setAbilities(prev => [...prev, ...moreAbilities]);
      setOffset(nextOffset);
    } catch (error) {
      console.error("Load more failed", error);
    } finally {
      setLoadingMore(false);
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

    const target = document.querySelector('#abilitiesInfiniteScroll');
    if (target) observer.observe(target);

    return () => observer.disconnect();
  }, [loading, loadingMore, offset]);

  const openModal = (name: string) => {
    const ability = abilities.find(a => a.name === name);
    if (ability) {
      setSelectedAbility(ability);
      setIsModalOpen(true);
    }
  };

  return (
    <main className={styles.mainContainer}>
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <h1 className={styles.title}>POKEDEX PRO MAX</h1>
        </div>
        <MiniNav />
      </header>

      <section className={styles.controls}>
        <p className={styles.subtitle}>Listado de habilidades especiales que los Pokémon pueden poseer.</p>
      </section>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <Skeleton height={150} />
              <div style={{ padding: '15px' }}>
                <Skeleton height={20} width="70%" />
                <Skeleton height={50} width="100%" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {Array.isArray(abilities) && abilities.map(ability => (
            <AbilityCard key={ability.name} ability={ability} onClick={openModal} />
          ))}
        </div>
      )}

      <div id="abilitiesInfiniteScroll" className={styles.loadMoreContainer}>
        {loadingMore && (
          <div className={styles.spinner} style={{ width: '30px', height: '30px', margin: '20px auto' }}></div>
        )}
      </div>

      {isModalOpen && selectedAbility && (
        <AbilityModal
          ability={selectedAbility}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      <footer className={styles.footer}>
        <p>&copy; 2026 POKEDEX &bull; PRO MAX</p>
      </footer>
    </main>
  );
}
