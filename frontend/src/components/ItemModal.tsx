import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ItemDetail } from '../types/catalog';
import styles from './ItemModal.module.css';
import { translate, getSpanishEffect } from '../utils/translations';

interface ItemModalProps {
    item: ItemDetail;
    onClose: () => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({ item, onClose }) => {
    const effectDesc = getSpanishEffect(item.effect_entries);

    return (
        <div className={styles.overlay} onClick={onClose} role="presentation">
            <motion.div
                className={styles.modal}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="item-modal-title"
                initial={{ opacity: 0, scale: 0.92, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
                <button
                    className={styles.closeBtn}
                    onClick={onClose}
                    aria-label="Cerrar modal"
                    type="button"
                >
                    &times;
                </button>

                <div className={styles.leftCol}>
                    {item.sprites?.default ? (
                        <Image
                            src={item.sprites.default}
                            alt={item.name}
                            className={styles.itemImage}
                            width={160}
                            height={160}
                        />
                    ) : (
                        <div className={styles.placeholder}>🎒</div>
                    )}

                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <span className={styles.attrBadge} style={{ borderColor: 'var(--accent-color)', color: 'var(--accent-color)', fontWeight: 800 }}>
                            {translate(item.category?.name, 'categories')}
                        </span>
                    </div>
                </div>

                <div className={styles.rightCol}>
                    <div className={styles.header}>
                        <span className={styles.id}>#{item.id?.toString().padStart(3, '0') || '???' }</span>
                        <h2 className={styles.name} id="item-modal-title">{(item.name || 'Sin nombre').replace('-', ' ')}</h2>
                    </div>

                    <h4 className={styles.sectionTitle}>Efecto</h4>
                    <div className={styles.effectText}>
                        {effectDesc}
                    </div>

                    <h4 className={styles.sectionTitle}>Atributos</h4>
                    <div className={styles.attributes}>
                        {item.attributes?.map((attr, idx) => (
                            <span key={`${attr.name || 'attr'}-${idx}`} className={styles.attrBadge}>
                                {(attr.name || '').replace(/-/g, ' ')}
                            </span>
                        ))}
                        {(item.attributes?.length === 0 || !item.attributes) && (
                            <span className={styles.attrBadge}>Ninguno</span>
                        )}
                    </div>

                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Costo</span>
                            <span className={styles.infoValue}>₽ {item.cost > 0 ? item.cost : 'No a la venta'}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Poder de Lanzamiento</span>
                            <span className={styles.infoValue}>☄️ {item.fling_power || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
