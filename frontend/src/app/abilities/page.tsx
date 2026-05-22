'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { fetchAbilities } from '../../services/catalogService';
import { AbilityDetail } from '../../types/catalog';
import { AbilityCard } from '../../components/AbilityCard';
import { Skeleton } from '../../components/Skeleton';
import { PageLayout } from '../../components/PageLayout';
import { ToastContainer } from '../../components/Toast';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useToast } from '../../hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../berries/berries.module.css'; // Reusing berries styles for consistency

const AbilityModal = dynamic(
  () => import('../../components/AbilityModal').then(mod => ({ default: mod.AbilityModal })),
  { ssr: false },
);

const LIMIT = 25;

export default function AbilitiesCatalog() {
  const [abilities, setAbilities] = useState<AbilityDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedAbility, setSelectedAbility] = useState<AbilityDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const triggerRef = useRef<HTMLDivElement>(null);
  const { toasts, showError, dismiss } = useToast();

  useEffect(() => {
    async function getInitialAbilities() {
      setLoading(true);
      try {
        const data = await fetchAbilities(LIMIT, 0);
        setAbilities(data);
        setOffset(0);
      } catch {
        showError('No se pudieron cargar las habilidades. Verifica tu conexión.');
      } finally {
        setLoading(false);
      }
    }
    getInitialAbilities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextOffset = offset + LIMIT;
    try {
      const moreAbilities = await fetchAbilities(LIMIT, nextOffset);
      setAbilities(prev => [...prev, ...moreAbilities]);
      setOffset(nextOffset);
    } catch {
      showError('Error al cargar más habilidades.');
    } finally {
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, loadingMore]);

  useInfiniteScroll(triggerRef, { loading, loadingMore, onLoadMore: loadMore });

  const openModal = (name: string) => {
    const ability = abilities.find(a => a.name === name);
    if (ability) {
      setSelectedAbility(ability);
      setIsModalOpen(true);
    }
  };

  // Filtrado client-side por searchTerm
  const filteredAbilities = abilities.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <main className={styles.mainContainer}>
      <PageLayout>
        <section className={styles.controls}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar habilidad (ej: overgrow, blaze...)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label="Buscar habilidad"
            />
          </div>
          <p className={styles.subtitle}>
            Listado de habilidades especiales que los Pokémon pueden poseer.
          </p>
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
        ) : filteredAbilities.length === 0 ? (
          <div className={styles.noResults}>
            <h2>Sin resultados para &ldquo;{searchTerm}&rdquo;</h2>
            <p>Prueba con otro nombre de habilidad.</p>
            <button className={styles.clearBtn} onClick={() => setSearchTerm('')}>
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredAbilities.map((ability, index) => (
              <motion.div
                key={ability.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
              >
                <AbilityCard ability={ability} onClick={openModal} />
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
          {isModalOpen && selectedAbility && (
            <AbilityModal ability={selectedAbility} onClose={() => setIsModalOpen(false)} />
          )}
        </AnimatePresence>
      </PageLayout>

      <ToastContainer messages={toasts} onDismiss={dismiss} />
    </main>
  );
}
