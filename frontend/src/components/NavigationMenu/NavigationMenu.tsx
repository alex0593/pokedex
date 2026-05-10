import React from 'react';
import Link from 'next/link';
import { BookOpen, Briefcase, Cherry, Sparkles, Swords, Gamepad2 } from 'lucide-react';
import styles from './NavigationMenu.module.css';

const navItems = [
  {
    href: '/pokemon',
    title: 'Pokédex',
    description: 'Explora, busca y filtra cientos de Pokémon con sus estadísticas detalladas.',
    Icon: BookOpen,
  },
  {
    href: '/items',
    title: 'Objetos',
    description: 'Descubre el inventario de objetos, Poké Balls y pociones.',
    Icon: Briefcase,
  },
  {
    href: '/berries',
    title: 'Bayas',
    description: 'Conoce las diferentes bayas, sus tamaños y tiempos de cosecha.',
    Icon: Cherry,
  },
  {
    href: '/abilities',
    title: 'Habilidades',
    description: 'Descubre las habilidades especiales de los Pokémon y sus efectos en batalla.',
    Icon: Sparkles,
  },
  {
    href: '/moves',
    title: 'Movimientos',
    description: 'Consulta la lista de ataques, su potencia, precisión y tipos.',
    Icon: Swords,
  },
  {
    href: '/game',
    title: 'Juego',
    description: 'Pon a prueba tus conocimientos y adivina la silueta del Pokémon.',
    Icon: Gamepad2,
  },
];

export const NavigationMenu: React.FC = () => {
  return (
    <div className={styles.grid}>
      {navItems.map((item, index) => {
        const { Icon } = item;
        return (
          <Link key={index} href={item.href} className={styles.card}>
            <div className={styles.iconWrapper}>
              <Icon size={40} strokeWidth={1.5} className={styles.icon} />
            </div>
            <h2 className={styles.title}>{item.title}</h2>
            <p className={styles.description}>{item.description}</p>
          </Link>
        );
      })}
    </div>
  );
};
