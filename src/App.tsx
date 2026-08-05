import { useEffect, useMemo, useState } from 'react';
import { PlanPanel } from './components/PlanPanel';
import { Rail } from './components/Rail';
import { RouteHeader } from './components/RouteHeader';
import { Stage } from './components/Stage';
import { CATALOG } from './data/catalog';
import type { Era } from './data/types';
import { useAuth } from './hooks/useAuth';
import { useTracker } from './hooks/useTracker';
import {
  buildLegs,
  buildRoute,
  computeReadiness,
  nextUnseenIndex,
  statusOf,
} from './lib/progress';
import { loadCatalog } from './lib/remoteCatalog';
import styles from './App.module.css';
import './styles/global.css';

export function App() {
  const auth = useAuth();
  const [planOpen, setPlanOpen] = useState(false);

  // Starts as the bundled copy so the first paint is immediate, then swaps to
  // the remote catalog if one loads. A failed fetch leaves this alone.
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

  // The route is derived from the tracker's mode, but the tracker needs the
  // route length to clamp `idx` — so the length is fed back through state
  // rather than mirroring the mode in two places.
  const [routeLength, setRouteLength] = useState(0);
  const tracker = useTracker(auth.userId, routeLength);

  const route = useMemo(() => buildRoute(catalog, tracker.mode), [catalog, tracker.mode]);

  useEffect(() => {
    setRouteLength(route.length);
  }, [route.length]);

  const readiness = useMemo(
    () => computeReadiness(catalog, tracker.watched, tracker.mode),
    [catalog, tracker.watched, tracker.mode],
  );

  const legs = useMemo(() => buildLegs(route, tracker.watched), [route, tracker.watched]);
  const station = route[tracker.idx] ?? null;

  const logged = useMemo(
    () =>
      route.filter((s) => statusOf(s.entry, tracker.watched[s.entry.id]) === 'full').length,
    [route, tracker.watched],
  );

  const nextUnseen = useMemo(
    () => nextUnseenIndex(route, tracker.watched, tracker.idx),
    [route, tracker.watched, tracker.idx],
  );

  const { goTo } = tracker;

  // Arrow keys travel the route; Esc closes the panel. Ignored while typing so
  // the sign-in field still works.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPlanOpen(false);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.isContentEditable)) return;
      if (planOpen) return;
      if (event.key === 'ArrowLeft') goTo(tracker.idx - 1);
      if (event.key === 'ArrowRight') goTo(tracker.idx + 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goTo, tracker.idx, planOpen]);

  return (
    <div className={styles.shell}>
      <RouteHeader
        station={route.length ? tracker.idx + 1 : 0}
        total={route.length}
        logged={logged}
        pct={readiness.pct}
        planOpen={planOpen}
        onTogglePlan={() => setPlanOpen((open) => !open)}
      />

      <Stage
        station={station}
        watched={tracker.watched}
        anim={tracker.anim}
        stamped={tracker.stamped}
        onToggle={tracker.toggleEntry}
        onToggleEpisode={tracker.toggleEpisode}
      />

      <Rail
        legs={legs}
        route={route}
        watched={tracker.watched}
        idx={tracker.idx}
        mode={tracker.mode}
        onGoTo={goTo}
      />

      {planOpen && (
        <PlanPanel
          mode={tracker.mode}
          readiness={readiness}
          catalog={catalog}
          auth={auth}
          syncing={tracker.syncing}
          synced={tracker.synced}
          snapshot={tracker.snapshot}
          nextUnseen={nextUnseen}
          onSelectMode={tracker.setMode}
          onJumpToNextUnseen={() => {
            if (nextUnseen >= 0) goTo(nextUnseen);
            setPlanOpen(false);
          }}
          onPurge={tracker.purge}
          onImport={tracker.merge}
          onClose={() => setPlanOpen(false)}
        />
      )}
    </div>
  );
}
