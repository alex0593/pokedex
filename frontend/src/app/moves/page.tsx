'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { fetchMoves } from '../../services/catalogService';
import { MoveDetail } from '../../types/catalog';
import { MoveCard } from '../../components/MoveCard';
import { Skeleton } from '../../components/Skeleton';
import { PageLayout } from '../../components/PageLayout';
import { ToastContainer } from '../../components/Toast';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useToast } from '../../hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../berries/berries.module.css'; // Reusing berries styles for consistency

const MoveModal = dynamic(
  () => import('../../components/MoveModal').then(mod => ({ default: mod.MoveModal })),
  { ssr: false },
);

const LIMIT = 25;

export default function MovesCatalog() {
  const [moves, setMoves] = useState<MoveDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedMove, setSelectedMove] = useState<MoveDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const triggerRef = useRef<HTMLDivElement>(null);
  const { toasts, showError, dismiss } = useToast();

  useEffect(() => {
    async function getInitialMoves() {
      setLoading(true);
      try {
        const data = await fetchMoves(LIMIT, 0);
        setMoves(data);
        setOffset(0);
      } catch {
        showError('No se pudieron cargar los movimientos. Verifica tu conexión.');
      } finally {
        setLoading(false);
      }
    }
    getInitialMoves();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextOffset = offset + LIMIT;
    try {
      const moreMoves = await fetchMoves(LIMIT, nextOffset);
      setMoves(prev => [...prev, ...moreMoves]);
      setOffset(nextOffset);
    } catch {
      showError('Error al cargar más movimientos.');
    } finally {
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, loadingMore]);

  useInfiniteScroll(triggerRef, { loading, loadingMore, onLoadMore: loadMore });

  const openModal = (name: string) => {
    const move = moves.find(m => m.name === name);
    if (move) {
      setSelectedMove(move);
      setIsModalOpen(true);
    }
  };

  // Filtrado client-side por searchTerm
  const filteredMoves = moves.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <main className={styles.mainContainer}>
      <PageLayout>
        <section className={styles.controls}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar movimiento (ej: tackle, surf...)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label="Buscar movimiento"
            />
          </div>
          <p className={styles.subtitle}>
            Consulta la lista completa de ataques y movimientos Pokémon.
          </p>
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
        ) : filteredMoves.length === 0 ? (
          <div className={styles.noResults}>
            <h2>Sin resultados para &ldquo;{searchTerm}&rdquo;</h2>
            <p>Prueba con otro nombre de movimiento.</p>
            <button className={styles.clearBtn} onClick={() => setSearchTerm('')}>
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredMoves.map((move, index) => (
              <motion.div
                key={move.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
              >
                <MoveCard move={move} onClick={openModal} />
              </motion.div>
            ))}
          </div>
        )}

        <div ref={triggerRef} className={styles.loadMoreContainer}>
          {loadingMore && (
            <div className={styles.spinner} style={{ width: '30px', height: '30px', margin: '20px auto' }} />
          )}
        </div>

        <AnimatePresence>
          {isModalOpen && selectedMove && (
            <MoveModal move={selectedMove} onClose={() => setIsModalOpen(false)} />
          )}
        </AnimatePresence>
      </PageLayout>

      <ToastContainer messages={toasts} onDismiss={dismiss} />
    </main>
  );
}
