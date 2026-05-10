import { NavigationMenu } from '@/components/NavigationMenu/NavigationMenu';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.mainContainer}>
      <NavigationMenu />

      <footer className={styles.footer}>
        <p>&copy; 2026 POKEDEX &bull; PRO MAX</p>
      </footer>
    </main>
  );
}
