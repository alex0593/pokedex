import React from 'react';
import Image from 'next/image';
import { BerryDetail } from '../types/catalog';
import styles from './BerryModal.module.css';
import { translate } from '../utils/translations';

interface BerryModalProps {
    berry: BerryDetail;
    onClose: () => void;
}

export const BerryModal: React.FC<BerryModalProps> = ({ berry, onClose }) => {
    const [imageError, setImageError] = React.useState(false);
    const imageUrl = berry.sprites?.default || '';

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>&times;</button>

                <div className={styles.leftCol}>
                    {!imageError ? (
                        <Image
                            src={imageUrl}
                            alt={berry.name}
                            className={styles.berryImage}
                            width={160}
                            height={160}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className={styles.placeholder}>🍒</div>
                    )}
                    
                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <span className={styles.flavorBadge} style={{ borderColor: 'var(--primary-color)' }}>
                            {translate(berry.firmness?.name, 'firmness')}
                        </span>
                    </div>
                </div>

                <div className={styles.rightCol}>
                    <div className={styles.header}>
                        <span className={styles.id}>#{berry.id?.toString().padStart(3, '0') || '???' }</span>
                        <h2 className={styles.name}>Baya {berry.name}</h2>
                    </div>

                    <div className={styles.statsSection}>
                        <h4 className={styles.sectionTitle}>Propiedades</h4>
                        <div className={styles.statRow}>
                            <div className={styles.statInfo}>
                                <span>Tiempo de Crecimiento</span>
                                <span>{berry.growth_time}h</span>
                            </div>
                            <div className={styles.statBarContainer}>
                                <div className={styles.statBarFill} style={{ width: `${(berry.growth_time / 24) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className={styles.statRow}>
                            <div className={styles.statInfo}>
                                <span>Máxima Cosecha</span>
                                <span>{berry.max_harvest}</span>
                            </div>
                            <div className={styles.statBarContainer}>
                                <div className={styles.statBarFill} style={{ width: `${(berry.max_harvest / 15) * 100}%`, background: '#10b981' }}></div>
                            </div>
                        </div>
                        <div className={styles.statRow}>
                            <div className={styles.statInfo}>
                                <span>Tamaño</span>
                                <span>{berry.size}mm</span>
                            </div>
                            <div className={styles.statBarContainer}>
                                <div className={styles.statBarFill} style={{ width: `${(berry.size / 500) * 100}%`, background: '#3b82f6' }}></div>
                            </div>
                        </div>
                        <div className={styles.statRow}>
                            <div className={styles.statInfo}>
                                <span>Sequedad del Suelo</span>
                                <span>{berry.soil_dryness}</span>
                            </div>
                            <div className={styles.statBarContainer}>
                                <div className={styles.statBarFill} style={{ width: `${(berry.soil_dryness / 20) * 100}%`, background: '#f59e0b' }}></div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className={styles.sectionTitle}>Sabores</h4>
                        <div className={styles.flavors}>
                            {berry.flavors?.filter(f => f.potency > 0).map(f => (
                                <div key={f.flavor.name} className={styles.flavorBadge}>
                                    <span>{translate(f.flavor.name, 'flavors')}</span>
                                    <span className={styles.flavorPotency}>Potencia: {f.potency}</span>
                                </div>
                            ))}
                            {(berry.flavors?.filter(f => f.potency > 0).length === 0 || !berry.flavors) && (
                                <span className={styles.flavorBadge}>Sin sabores predominantes</span>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: '25px' }}>
                        <h4 className={styles.sectionTitle}>Regalo Natural</h4>
                        <div className={styles.statInfo}>
                            <span>Poder</span>
                            <span style={{ color: 'var(--accent-color)', fontWeight: 800 }}>{berry.natural_gift_power}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
