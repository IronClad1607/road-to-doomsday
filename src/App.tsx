import { useMemo } from 'react';
import { EraSection } from './components/EraSection';
import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { Readiness } from './components/Readiness';
import { CATALOG } from './data/catalog';
import { useTracker } from './hooks/useTracker';
import { computeReadiness } from './lib/progress';
import styles from './App.module.css';
import './styles/global.css';

export function App() {
  const tracker = useTracker();

  const readiness = useMemo(
    () => computeReadiness(CATALOG, tracker.watched, tracker.mode),
    [tracker.watched, tracker.mode],
  );

  return (
    <div className={styles.shell}>
      <div className={styles.rail}>
        <Header onPurge={tracker.purge} />
        <ModeSelector mode={tracker.mode} onSelect={tracker.setMode} />
        <Readiness readiness={readiness} />
        <div className={styles.divider}>THE SPINE</div>
      </div>

      {CATALOG.map((era) => (
        <EraSection
          key={era.id}
          era={era}
          watched={tracker.watched}
          mode={tracker.mode}
          progress={readiness.perEra.get(era.id) ?? { done: 0, inMode: 0 }}
          onToggleEntry={tracker.toggleEntry}
        />
      ))}
    </div>
  );
}
