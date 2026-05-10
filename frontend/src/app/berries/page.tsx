'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchBerries } from '../../services/catalogService';
import { BerryDetail } from '../../types/catalog';
import { BerryCard } from '../../components/BerryCard';
import { BerryModal } from '../../components/BerryModal';
import { Skeleton } from '../../components/Skeleton';
import styles from './berries.module.css';
import { MiniNav } from '../../components/MiniNav';

const LIMIT = 25;

export default function BerriesCatalog() {
  const [berries, setBerries] = useState<BerryDetail[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedBerry, setSelectedBerry] = useState<BerryDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function getInitialBerries() {
      setLoading(true);
      try {
        const data = await fetchBerries(LIMIT, 0);
        setBerries(data);
        setOffset(0);
      } catch (error) {
        console.error("Failed to fetch initial berries", error);
      } finally {
        setLoading(false);
      }
    }
    getInitialBerries();
  }, []);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextOffset = offset + LIMIT;
    try {
      const moreBerries = await fetchBerries(LIMIT, nextOffset);
      setBerries(prev => [...prev, ...moreBerries]);
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

    const target = document.querySelector('#berriesInfiniteScroll');
    if (target) observer.observe(target);

    return () => observer.disconnect();
  }, [loading, loadingMore, offset]);

  const openModal = (name: string) => {
    const berry = berries.find(b => b.name === name);
    if (berry) {
      setSelectedBerry(berry);
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
        <p className={styles.subtitle}>Listado de todas las bayas, sus tamaños y tiempos de cosecha.</p>
      </section>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <Skeleton height={120} borderRadius="15px 15px 0 0" />
              <div style={{ padding: '15px' }}>
                <Skeleton height={20} width="70%" />
                <Skeleton height={15} width="40%" />
                <Skeleton height={30} width="100%" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {berries.map(berry => (
            <BerryCard key={berry.name} berry={berry} onClick={openModal} />
          ))}
        </div>
      )}

      <div id="berriesInfiniteScroll" className={styles.loadMoreContainer}>
        {loadingMore && (
          <div className={styles.spinner} style={{ width: '30px', height: '30px', margin: '20px auto' }}></div>
        )}
      </div>

      {isModalOpen && selectedBerry && (
        <BerryModal
          berry={selectedBerry}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      <footer className={styles.footer}>
        <p>&copy; 2026 POKEDEX &bull; PRO MAX</p>
      </footer>
    </main>
  );
}
