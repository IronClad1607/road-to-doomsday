import { useRef, useState, type ChangeEvent } from 'react';
import type { TrackerState } from '../lib/storage';
import { entryCount, exportFilename, parseImport, serialiseExport } from '../lib/transfer';
import styles from './Archive.module.css';

interface ArchiveProps {
  state: TrackerState;
  onImport: (incoming: TrackerState) => void;
}

interface Status {
  message: string;
  error?: boolean;
}

/**
 * Export and import the rewatch log as a JSON file.
 *
 * Progress lives in localStorage, which is per-browser and gets cleared by
 * anything from a cache wipe to private browsing — so it needs a way out.
 */
export function Archive({ state, onImport }: ArchiveProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status | null>(null);

  const handleExport = () => {
    const url = URL.createObjectURL(
      new Blob([serialiseExport(state)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename();
    link.click();
    URL.revokeObjectURL(url);
    setStatus({ message: `EXPORTED ${entryCount(state)} ENTRIES` });
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset immediately so re-picking the same file still fires a change event.
    event.target.value = '';
    if (!file) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      setStatus({ message: 'COULD NOT READ FILE', error: true });
      return;
    }

    const incoming = parseImport(text);
    if (!incoming) {
      setStatus({ message: 'NOT A VALID LOG FILE', error: true });
      return;
    }

    onImport(incoming);
    setStatus({ message: `MERGED ${entryCount(incoming)} ENTRIES` });
  };

  return (
    <section className={styles.archive} aria-label="Archive">
      <h2 className={styles.heading}>ARCHIVE</h2>

      <div className={styles.controls}>
        <button type="button" className={styles.button} onClick={handleExport}>
          EXPORT LOG ▾
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => fileInput.current?.click()}
        >
          IMPORT LOG ▴
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      <p
        className={`${styles.status} ${status?.error ? styles.statusError : ''}`}
        role="status"
        aria-live="polite"
      >
        {status?.message ?? ''}
      </p>

      <p className={styles.note}>
        IMPORT MERGES INTO YOUR CURRENT LOG · NOTHING IS OVERWRITTEN
      </p>
    </section>
  );
}
