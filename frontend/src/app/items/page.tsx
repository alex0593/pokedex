'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchItems } from '../../services/catalogService';
import { ItemDetail } from '../../types/catalog';
import { ItemCard } from '../../components/ItemCard';
import { ItemModal } from '../../components/ItemModal';
import { Skeleton } from '../../components/Skeleton';
import styles from './items.module.css';
import { MiniNav } from '../../components/MiniNav';

const LIMIT = 25;

export default function ItemsCatalog() {
  const [items, setItems] = useState<ItemDetail[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function getInitialItems() {
      setLoading(true);
      try {
        const data = await fetchItems(LIMIT, 0);
        setItems(data);
        setOffset(0);
      } catch (error) {
        console.error("Failed to fetch initial items", error);
      } finally {
        setLoading(false);
      }
    }
    getInitialItems();
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextOffset = offset + LIMIT;
    try {
      const moreItems = await fetchItems(LIMIT, nextOffset);
      setItems(prev => [...prev, ...moreItems]);
      setOffset(nextOffset);
    } catch (error) {
      console.error("Load more failed", error);
    } finally {
      setLoadingMore(false);
    }
  }, [offset, loadingMore]);

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

    const target = document.querySelector('#itemsInfiniteScroll');
    if (target) observer.observe(target);

    return () => observer.disconnect();
  }, [loading, loadingMore, loadMore]);

  const openModal = (name: string) => {
    const item = items.find(i => i.name === name);
    if (item) {
      setSelectedItem(item);
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
        <p className={styles.subtitle}>Listado de todos los items y objetos utilizables.</p>
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
      ) : (
        <div className={styles.grid}>
          {items.map(item => (
            <ItemCard key={item.name} item={item} onClick={openModal} />
          ))}
        </div>
      )}

      <div id="itemsInfiniteScroll" className={styles.loadMoreContainer}>
        {loadingMore && (
          <div className={styles.spinner} style={{ width: '30px', height: '30px', margin: '20px auto' }}></div>
        )}
      </div>

      {isModalOpen && selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      <footer className={styles.footer}>
        <p>&copy; 2026 POKEDEX &bull; PRO MAX</p>
      </footer>
    </main>
  );
}
