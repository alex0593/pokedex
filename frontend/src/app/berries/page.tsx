'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { fetchBerries } from '../../services/catalogService';
import { BerryDetail } from '../../types/catalog';
import { BerryCard } from '../../components/BerryCard';
import { Skeleton } from '../../components/Skeleton';
import { PageLayout } from '../../components/PageLayout';
import { ToastContainer } from '../../components/Toast';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useToast } from '../../hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import styles from './berries.module.css';

const BerryModal = dynamic(
  () => import('../../components/BerryModal').then(mod => ({ default: mod.BerryModal })),
  { ssr: false },
);

const LIMIT = 25;

export default function BerriesCatalog() {
  const [berries, setBerries] = useState<BerryDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedBerry, setSelectedBerry] = useState<BerryDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const triggerRef = useRef<HTMLDivElement>(null);
  const { toasts, showError, dismiss } = useToast();
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();

  useEffect(() => {
    async function getInitialBerries() {
      setLoading(true);
      try {
        const data = await fetchBerries(LIMIT, 0);
        setBerries(data);
        setOffset(0);
      } catch {
        showError('No se pudieron cargar las bayas. Verifica tu conexión.');
      } finally {
        setLoading(false);
      }
    }
    getInitialBerries();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextOffset = offset + LIMIT;
    try {
      const moreBerries = await fetchBerries(LIMIT, nextOffset);
      setBerries(prev => [...prev, ...moreBerries]);
      setOffset(nextOffset);
    } catch {
      showError('Error al cargar más bayas.');
    } finally {
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, loadingMore]);

  useInfiniteScroll(triggerRef, { loading, loadingMore, onLoadMore: loadMore });

  const openModal = (name: string) => {
    const berry = berries.find(b => b.name === name);
    if (berry) {
      setSelectedBerry(berry);
      setIsModalOpen(true);
    }
  };

  // Filtrado client-side por searchTerm
  const filteredBerries = berries.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <main className={styles.mainContainer}>
      <PageLayout>
        <section className={styles.controls}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar baya (ej: oran, sitrus...)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label="Buscar baya"
            />
          </div>
          <p className={styles.subtitle}>
            Listado de todas las bayas, sus tamaños y tiempos de cosecha.
          </p>
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
        ) : filteredBerries.length === 0 ? (
          <div className={styles.noResults}>
            <h2>Sin resultados para &ldquo;{searchTerm}&rdquo;</h2>
            <p>Prueba con otro nombre de baya.</p>
            <button className={styles.clearBtn} onClick={() => setSearchTerm('')}>
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredBerries.map((berry, index) => (
              <motion.div
                key={berry.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
              >
                <BerryCard
                  berry={berry}
                  onClick={openModal}
                  isFavorite={user ? isFavorite('berry', berry.name) : undefined}
                  onToggleFavorite={user ? () => toggle('berry', berry.name, berry.id) : undefined}
                />
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
          {isModalOpen && selectedBerry && (
            <BerryModal berry={selectedBerry} onClose={() => setIsModalOpen(false)} />
          )}
        </AnimatePresence>
      </PageLayout>

      <ToastContainer messages={toasts} onDismiss={dismiss} />
    </main>
  );
}
