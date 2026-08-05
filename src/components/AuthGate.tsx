import { useState, type KeyboardEvent } from 'react';
import type { Auth } from '../hooks/useAuth';
import styles from './AuthGate.module.css';

interface AuthGateProps {
  auth: Auth;
}

/**
 * Blocking sign-in wall. Nothing behind it renders until there is a session.
 *
 * Deliberately not a <form>: submission is a single async call, and a real
 * form brings default navigation this page does not want. Enter is wired up by
 * hand so the keyboard still works.
 */
export function AuthGate({ auth }: AuthGateProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    const failure = await auth.signIn(email);
    setSending(false);
    setError(failure !== null);
    setStatus(failure ?? 'LINK SENT · CHECK YOUR EMAIL');
    if (!failure) setEmail('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !sending) void send();
  };

  return (
    <div className={styles.gate}>
      <div className={styles.lockup}>
        Road to
        <span className={styles.lockupAccent}>Doomsday</span>
      </div>
      <div className={styles.showtime}>18 DEC 2026 · 09:00 IST</div>

      <p className={styles.blurb}>
        Sign in to open your route. Progress is kept against your account, so it follows you to
        every device.
      </p>

      <div className={styles.row}>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          className={styles.input}
          placeholder="you@example.com"
          aria-label="Email address for sign-in link"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
        />
        <button
          type="button"
          className={styles.submit}
          disabled={sending}
          onClick={() => void send()}
        >
          {sending ? 'SENDING…' : 'SEND LINK ▸'}
        </button>
      </div>

      <p
        className={`${styles.status} ${error ? styles.statusError : ''}`}
        role="status"
        aria-live="polite"
      >
        {status ?? ''}
      </p>

      <p className={styles.note}>
        NO PASSWORD · THE LINK SIGNS YOU IN AND EXPIRES
      </p>
    </div>
  );
}

/** Placeholder while the session is being restored. */
export function AuthLoading() {
  return <div className={styles.loading}>RESTORING SESSION…</div>;
}
