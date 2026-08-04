import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive } from './components/Archive';
import { BackToTop } from './components/BackToTop';
import { EraSection, eraDomId } from './components/EraSection';
import { Finale } from './components/Finale';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { NextUp } from './components/NextUp';
import { PlanPanel } from './components/PlanPanel';
import { StatusBar } from './components/StatusBar';
import { CATALOG } from './data/catalog';
import type { Era } from './data/types';
import { useAuth } from './hooks/useAuth';
import { useTracker } from './hooks/useTracker';
import { computeReadiness, erasInMode, nextUnwatched } from './lib/progress';
import { loadCatalog } from './lib/remoteCatalog';
import { scrollToElement } from './lib/scroll';
import styles from './App.module.css';
import './styles/global.css';

const NO_PROGRESS = { done: 0, inMode: 0 } as const;

export function App() {
  const auth = useAuth();
  const tracker = useTracker(auth.userId);
  const [planOpen, setPlanOpen] = useState(false);

  // Starts as the bundled copy so the page paints immediately, then swaps to
  // the remote catalog if one loads. A failed fetch simply leaves this alone.
  const [catalog, setCatalog] = useState<readonly Era[]>(CATALOG);

  useEffect(() => {
    let cancelled = false;
    void loadCatalog().then(({ catalog: loaded }) => {
      if (!cancelled) setCatalog(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const readiness = useMemo(
    () => computeReadiness(catalog, tracker.watched, tracker.mode),
    [catalog, tracker.watched, tracker.mode],
  );

  // An era with nothing in the active plan is dead weight — drop it from the
  // rail and the body rather than rendering a 0/0 header.
  const eras = useMemo(() => erasInMode(catalog, tracker.mode), [catalog, tracker.mode]);

  const next = useMemo(
    () => nextUnwatched(catalog, tracker.watched, tracker.mode),
    [catalog, tracker.watched, tracker.mode],
  );

  const progressFor = useCallback(
    (eraId: string) => readiness.perEra.get(eraId) ?? NO_PROGRESS,
    [readiness],
  );

  /**
   * Open an era and bring it under the sticky bar. The scroll waits a frame so
   * it measures the expanded layout rather than the collapsed one.
   */
  const jumpToEra = useCallback(
    (eraId: string) => {
      if (tracker.openEra !== eraId) tracker.setOpenEra(eraId);
      requestAnimationFrame(() => {
        const node = document.getElementById(eraDomId(eraId));
        if (node) scrollToElement(node);
      });
    },
    [tracker],
  );

  return (
    <div className={styles.shell}>
      <div className={styles.rail}>
        <Header />
      </div>

      <StatusBar
        pct={readiness.pct}
        eras={eras}
        progressFor={progressFor}
        openEra={tracker.openEra}
        planOpen={planOpen}
        onTogglePlan={() => setPlanOpen((open) => !open)}
        onJumpToEra={jumpToEra}
      />

      {planOpen && (
        <PlanPanel
          mode={tracker.mode}
          readiness={readiness}
          hideLogged={tracker.hideLogged}
          auth={auth}
          syncing={tracker.syncing}
          catalog={catalog}
          onSelectMode={tracker.setMode}
          onToggleHideLogged={tracker.toggleHideLogged}
          onCollapseAll={tracker.collapseAll}
          onPurge={tracker.purge}
        />
      )}

      <NextUp next={next} onGo={jumpToEra} onPlanComplete={() => setPlanOpen(true)} />

      {eras.map((era) => (
        <EraSection
          key={era.id}
          era={era}
          watched={tracker.watched}
          mode={tracker.mode}
          progress={progressFor(era.id)}
          isOpen={tracker.openEra === era.id}
          open={tracker.open}
          hideLogged={tracker.hideLogged}
          onToggleEra={tracker.setOpenEra}
          onToggleEntry={tracker.toggleEntry}
          onToggleEpisode={tracker.toggleEpisode}
          onToggleOpen={tracker.toggleOpen}
        />
      ))}

      <div className={styles.outro}>
        <Finale pct={readiness.pct} />
        <Archive state={tracker.snapshot} onImport={tracker.merge} />
        <Footer rank={readiness.rank} />
      </div>

      <BackToTop />
    </div>
  );
}
