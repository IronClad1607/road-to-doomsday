import { useEffect, useState } from 'react';
import { scrollTop, scrollToTop } from '../lib/scroll';
import styles from './BackToTop.module.css';

/** Only worth showing once there is something to come back from. */
const SHOW_AFTER_PX = 400;

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(scrollTop() > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button type="button" className={styles.button} onClick={scrollToTop} aria-label="Back to top">
      <span aria-hidden="true">▲</span>
    </button>
  );
}
