'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { fetchItems } from '../../services/catalogService';
import { ItemDetail } from '../../types/catalog';
import { ItemCard } from '../../components/ItemCard';
import { Skeleton } from '../../components/Skeleton';
import { PageLayout } from '../../components/PageLayout';
import { ToastContainer } from '../../components/Toast';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useToast } from '../../hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './items.module.css';

const ItemModal = dynamic(
  () => import('../../components/ItemModal').then(mod => ({ default: mod.ItemModal })),
  { ssr: false },
);

const LIMIT = 25;

export default function ItemsCatalog() {
  const [items, setItems] = useState<ItemDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const triggerRef = useRef<HTMLDivElement>(null);
  const { toasts, showError, dismiss } = useToast();

  useEffect(() => {
    async function getInitialItems() {
      setLoading(true);
      try {
        const data = await fetchItems(LIMIT, 0);
        setItems(data);
        setOffset(0);
      } catch {
        showError('No se pudieron cargar los objetos. Verifica tu conexión.');
      } finally {
        setLoading(false);
      }
    }
    getInitialItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextOffset = offset + LIMIT;
    try {
      const moreItems = await fetchItems(LIMIT, nextOffset);
      setItems(prev => [...prev, ...moreItems]);
      setOffset(nextOffset);
    } catch {
      showError('Error al cargar más objetos.');
    } finally {
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, loadingMore]);

  useInfiniteScroll(triggerRef, { loading, loadingMore, onLoadMore: loadMore });

  const openModal = (name: string) => {
    const item = items.find(i => i.name === name);
    if (item) {
      setSelectedItem(item);
      setIsModalOpen(true);
    }
  };

  // Filtrado client-side por searchTerm
  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <main className={styles.mainContainer}>
      <PageLayout>
        <section className={styles.controls}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar objeto (ej: poción, pokéball...)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label="Buscar objeto"
            />
          </div>
          <p className={styles.subtitle}>
            Listado de todos los objetos y objetos utilizables.
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
                  <Skeleton height={50} width="100%" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={styles.noResults}>
            <h2>Sin resultados para &ldquo;{searchTerm}&rdquo;</h2>
            <p>Prueba con otro nombre de objeto.</p>
            <button className={styles.clearBtn} onClick={() => setSearchTerm('')}>
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
              >
                <ItemCard item={item} onClick={openModal} />
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
          {isModalOpen && selectedItem && (
            <ItemModal item={selectedItem} onClose={() => setIsModalOpen(false)} />
          )}
        </AnimatePresence>
      </PageLayout>

      <ToastContainer messages={toasts} onDismiss={dismiss} />
    </main>
  );
}
