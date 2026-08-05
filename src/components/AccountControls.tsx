import { useState, type KeyboardEvent } from 'react';
import type { Auth } from '../hooks/useAuth';
import styles from './PlanPanel.module.css';

interface AccountControlsProps {
  auth: Auth;
  syncing: boolean;
  /** Whether a remote read has actually succeeded. */
  synced: boolean;
}

/**
 * Sign in to sync progress across devices.
 *
 * Deliberately not a <form>: submission here is a single async call, and a
 * real form brings default navigation behaviour this page does not want.
 * Enter is wired up by hand so the keyboard still works.
 */
export function AccountControls({ auth, syncing, synced }: AccountControlsProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (auth.status === 'disabled') return null;

  if (auth.status === 'signed-in') {
    return (
      <div className={styles.account}>
        <div className={styles.accountRow}>
          {/* Signed in is not the same as syncing — say which is true. */}
          <span className={`${styles.accountEmail} ${!syncing && !synced ? styles.accountWarn : ''}`}>
            {syncing
              ? 'SYNCING…'
              : synced
                ? `SYNCED · ${auth.email ?? 'ACCOUNT'}`
                : 'SIGNED IN · SYNC UNAVAILABLE'}
          </span>
          <button type="button" className={styles.control} onClick={() => void auth.signOut()}>
            SIGN OUT
          </button>
        </div>
        <p className={styles.accountNote}>
          {synced
            ? 'PROGRESS SYNCS TO THIS ACCOUNT ON EVERY DEVICE'
            : 'PROGRESS IS SAVED IN THIS BROWSER ONLY — CHECK THE SUPABASE SCHEMA'}
        </p>
      </div>
    );
  }

  const send = async () => {
    setSending(true);
    const error = await auth.signIn(email);
    setSending(false);
    setStatus(error ?? 'CHECK YOUR EMAIL FOR THE LINK');
    if (!error) setEmail('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !sending) void send();
  };

  return (
    <div className={styles.account}>
      <div className={styles.accountRow}>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          className={styles.accountInput}
          placeholder="you@example.com"
          aria-label="Email address for sign-in link"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className={styles.control}
          disabled={sending}
          onClick={() => void send()}
        >
          {sending ? 'SENDING…' : 'SYNC ▸'}
        </button>
      </div>
      <p className={styles.accountNote} role="status" aria-live="polite">
        {status ?? 'SIGN IN WITH AN EMAIL LINK TO SYNC ACROSS DEVICES'}
      </p>
    </div>
  );
}
