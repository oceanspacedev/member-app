import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { api, ApiError, setAuthToken, setUnauthorizedHandler } from './api';
import { getItem, setItem } from './storage';
import type { Loyalty, User } from './types';

const TOKEN_KEY = 'lc.token';
// Dipilih lewat "Masuk sebagai tamu": aplikasi langsung dibuka tanpa login sampai tamu memilih masuk.
const GUEST_KEY = 'lc.guest';
// Data akun terakhir, agar aplikasi tetap terbuka saat dibuka tanpa internet.
const ME_KEY = 'lc.me';

type Me = { user: User; loyalty: Loyalty | null };

async function readCachedMe(): Promise<Me | null> {
  try {
    const raw = await getItem(ME_KEY);
    return raw ? (JSON.parse(raw) as Me) : null;
  } catch {
    return null;
  }
}

/** guest = belum login tetapi boleh menjelajah katalog (promo, outlet, brand, level member). */
type Status = 'loading' | 'signedOut' | 'guest' | 'signedIn';

type SessionValue = {
  status: Status;
  user: User | null;
  loyalty: Loyalty | null;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
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
    await setItem(GUEST_KEY, null);
    await setItem(ME_KEY, null);
    setUser(null);
    setLoyalty(null);
    setStatus('signedOut');
  }, []);

  const refresh = useCallback(async () => {
    const me = await api<{ user: User; loyalty: Loyalty }>('/me');
    setUser(me.user);
    setLoyalty(me.loyalty);
    void setItem(ME_KEY, JSON.stringify({ user: me.user, loyalty: me.loyalty } satisfies Me)).catch(() => undefined);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void clear());

    (async () => {
      const token = await getItem(TOKEN_KEY);
      if (!token) return setStatus((await getItem(GUEST_KEY)) ? 'guest' : 'signedOut');

      setAuthToken(token);

      // Ada data akun tersimpan: buka aplikasi langsung, sinkronkan di belakang layar
      // (tidak menunggu jaringan di layar pembuka saat sinyal lemah).
      const cached = await readCachedMe();
      if (cached) {
        setUser(cached.user);
        setLoyalty(cached.loyalty);
        setStatus('signedIn');
        // 401 → handler onUnauthorized mengeluarkan user; gagal jaringan → tetap pakai data tersimpan.
        void refresh().catch(() => undefined);
        return;
      }

      try {
        await refresh();
        setStatus('signedIn');
      } catch (e) {
        // 401 = token ditolak; handler onUnauthorized sudah mengeluarkan user.
        if (e instanceof ApiError && e.status === 401) return;

        // Offline tanpa data tersimpan: tampilkan login, tetapi token tetap disimpan
        // sehingga saat internet kembali, membuka ulang aplikasi langsung masuk.
        setAuthToken(null);
        setStatus('signedOut');
      }
    })();

    return () => setUnauthorizedHandler(null);
  }, [clear, refresh]);

  const signIn = useCallback(
    async (token: string, signedInUser: User) => {
      setAuthToken(token);
      await setItem(TOKEN_KEY, token);
      await setItem(GUEST_KEY, null);
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

  // Kembali ke aplikasi (mis. setelah sinyal pulih): sinkronkan poin & data akun tanpa mengganggu.
  useEffect(() => {
    if (status !== 'signedIn') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh().catch(() => undefined);
    });
    return () => sub.remove();
  }, [status, refresh]);

  const continueAsGuest = useCallback(async () => {
    await setItem(GUEST_KEY, '1');
    setStatus('guest');
  }, []);

  const value = useMemo(
    () => ({ status, user, loyalty, signIn, signOut, continueAsGuest, refresh, setUser }),
    [status, user, loyalty, signIn, signOut, continueAsGuest, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession harus dipakai di dalam <SessionProvider>');
  return ctx;
}
