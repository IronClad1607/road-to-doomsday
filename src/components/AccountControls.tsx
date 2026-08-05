import type { Auth } from '../hooks/useAuth';
import styles from './PlanPanel.module.css';

interface AccountControlsProps {
  auth: Auth;
  syncing: boolean;
  /** Whether a remote read has actually succeeded. */
  synced: boolean;
}

/**
 * Account status and sign-out, inside the plan panel.
 *
 * There is no sign-in form here: sign-in is a blocking gate, so by the time
 * anything behind it renders there is already a session. The only state left
 * to show is whether that session is actually syncing.
 */
export function AccountControls({ auth, syncing, synced }: AccountControlsProps) {
  if (auth.status !== 'signed-in') return null;

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
