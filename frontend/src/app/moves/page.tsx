'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchMoves } from '../../services/catalogService';
import { MoveDetail } from '../../types/catalog';
import { MoveCard } from '../../components/MoveCard';
import { MoveModal } from '../../components/MoveModal';
import { Skeleton } from '../../components/Skeleton';
import styles from '../berries/berries.module.css'; // Reusing berries styles for consistency
import { MiniNav } from '../../components/MiniNav';

const LIMIT = 25;

export default function MovesCatalog() {
  const [moves, setMoves] = useState<MoveDetail[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedMove, setSelectedMove] = useState<MoveDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function getInitialMoves() {
      setLoading(true);
      try {
        const data = await fetchMoves(LIMIT, 0);
        setMoves(data);
        setOffset(0);
      } catch (error) {
        console.error("Failed to fetch initial moves", error);
      } finally {
        setLoading(false);
      }
    }
    getInitialMoves();
  }, []);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextOffset = offset + LIMIT;
    try {
      const moreMoves = await fetchMoves(LIMIT, nextOffset);
      setMoves(prev => [...prev, ...moreMoves]);
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

    const target = document.querySelector('#movesInfiniteScroll');
    if (target) observer.observe(target);

    return () => observer.disconnect();
  }, [loading, loadingMore, offset]);

  const openModal = (name: string) => {
    const move = moves.find(m => m.name === name);
    if (move) {
      setSelectedMove(move);
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
        <p className={styles.subtitle}>Consulta la lista completa de ataques y movimientos Pokémon.</p>
      </section>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <Skeleton height={150} />
              <div style={{ padding: '15px' }}>
                <Skeleton height={20} width="70%" />
                <Skeleton height={40} width="100%" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {Array.isArray(moves) && moves.map(move => (
            <MoveCard key={move.name} move={move} onClick={openModal} />
          ))}
        </div>
      )}

      <div id="movesInfiniteScroll" className={styles.loadMoreContainer}>
        {loadingMore && (
          <div className={styles.spinner} style={{ width: '30px', height: '30px', margin: '20px auto' }}></div>
        )}
      </div>

      {isModalOpen && selectedMove && (
        <MoveModal
          move={selectedMove}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      <footer className={styles.footer}>
        <p>&copy; 2026 POKEDEX &bull; PRO MAX</p>
      </footer>
    </main>
  );
}
