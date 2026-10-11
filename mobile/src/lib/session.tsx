import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, setAuthToken, setUnauthorizedHandler } from './api';
import { getItem, setItem } from './storage';
import type { Loyalty, User } from './types';

const TOKEN_KEY = 'lc.token';

type Status = 'loading' | 'signedOut' | 'signedIn';

type SessionValue = {
  status: Status;
  user: User | null;
  loyalty: Loyalty | null;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);

  const clear = useCallback(async () => {
    setAuthToken(null);
    await setItem(TOKEN_KEY, null);
    setUser(null);
    setLoyalty(null);
    setStatus('signedOut');
  }, []);

  const refresh = useCallback(async () => {
    const me = await api<{ user: User; loyalty: Loyalty }>('/me');
    setUser(me.user);
    setLoyalty(me.loyalty);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void clear());

    (async () => {
      const token = await getItem(TOKEN_KEY);
      if (!token) return setStatus('signedOut');

      setAuthToken(token);
      try {
        await refresh();
        setStatus('signedIn');
      } catch {
        await clear();
      }
    })();

    return () => setUnauthorizedHandler(null);
  }, [clear, refresh]);

  const signIn = useCallback(
    async (token: string, signedInUser: User) => {
      setAuthToken(token);
      await setItem(TOKEN_KEY, token);
      setUser(signedInUser);
      await refresh().catch(() => undefined);
      setStatus('signedIn');
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    await clear();
  }, [clear]);

  const value = useMemo(
    () => ({ status, user, loyalty, signIn, signOut, refresh, setUser }),
    [status, user, loyalty, signIn, signOut, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession harus dipakai di dalam <SessionProvider>');
  return ctx;
}
