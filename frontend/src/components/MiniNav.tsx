'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './MiniNav.module.css';

export const MiniNav: React.FC = () => {
    const pathname = usePathname();

    const navItems = [
        { name: '🏠 Inicio', path: '/' },
        { name: '🔍 Pokémon', path: '/pokemon' },
        { name: '🎒 Objetos', path: '/items' },
        { name: '🍒 Bayas', path: '/berries' },
        { name: '✨ Habilidades', path: '/abilities' },
        { name: '⚔️ Movimientos', path: '/moves' },
        { name: '🎮 Juego', path: '/game' },
    ];

    return (
        <nav className={styles.navBar}>
            {navItems.map((item) => (
                <Link 
                    key={item.path} 
                    href={item.path}
                    className={`${styles.navBtn} ${pathname === item.path ? styles.active : ''}`}
                >
                    {item.name}
                </Link>
            ))}
        </nav>
    );
};
