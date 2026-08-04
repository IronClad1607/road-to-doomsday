import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type AuthStatus = 'disabled' | 'loading' | 'signed-out' | 'signed-in';

export interface Auth {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  /** Send a magic link. Resolves to an error message, or null on success. */
  signIn: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

/**
 * Supabase session state.
 *
 * `disabled` is a first-class status, not a failure: without credentials the
 * app runs entirely on bundled data and browser-local progress, and the UI
 * simply omits the sign-in control.
 */
export function useAuth(): Auth {
  const [status, setStatus] = useState<AuthStatus>(supabase ? 'loading' : 'disabled');
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    const apply = (session: { user: { id: string; email?: string } } | null) => {
      if (cancelled) return;
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
      setStatus(session ? 'signed-in' : 'signed-out');
    };

    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session));

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (address: string): Promise<string | null> => {
    if (!supabase) return 'REMOTE SYNC NOT CONFIGURED';
    const trimmed = address.trim();
    if (!trimmed) return 'ENTER AN EMAIL ADDRESS';

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      // Come back to this exact page, subpath and all.
      options: { emailRedirectTo: window.location.href.split('#')[0] },
    });
    return error ? error.message.toUpperCase() : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  return { status, userId, email, signIn, signOut };
}
