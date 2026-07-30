import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { useTracker } from './hooks/useTracker';
import styles from './App.module.css';
import './styles/global.css';

export function App() {
  const tracker = useTracker();

  return (
    <div className={styles.shell}>
      <div className={styles.rail}>
        <Header onPurge={tracker.purge} />
        <ModeSelector mode={tracker.mode} onSelect={tracker.setMode} />
        <div className={styles.divider}>THE SPINE</div>
      </div>
    </div>
  );
}
