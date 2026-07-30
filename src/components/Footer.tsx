import { ALL_ENTRIES } from '../data/catalog';
import styles from './Footer.module.css';

interface FooterProps {
  rank: string;
}

export function Footer({ rank }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div>
        {ALL_ENTRIES.length} ENTRIES TRACKED · RANK: {rank}
      </div>
      <div>STORY ORDER · IN-UNIVERSE CHRONOLOGY · PROGRESS PERSISTS</div>
    </footer>
  );
}
