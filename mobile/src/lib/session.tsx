import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, DevSettings, Platform } from 'react-native';

import { api, ApiError, setAuthToken, setUnauthorizedHandler } from './api';
import { getItem, setItem } from './storage';
import type { Loyalty, User } from './types';

const TOKEN_KEY = 'lc.token';
// Dipilih lewat "Masuk sebagai tamu": aplikasi langsung dibuka tanpa login sampai tamu memilih masuk.
const GUEST_KEY = 'lc.guest';
// Data akun terakhir, agar aplikasi tetap terbuka saat dibuka tanpa internet.
const ME_KEY = 'lc.me';
// Pengenalan aplikasi (onboarding) hanya tampil sekali, pada pembukaan pertama setelah dipasang.
const ONBOARDED_KEY = 'lc.onboarded';

type Me = { user: User; loyalty: Loyalty | null };

/**
 * Khusus pengembangan: hapus data lokal (login, mode tamu, pengenalan) lalu muat ulang, supaya alur
 * pembukaan pertama bisa dicoba lagi tanpa memasang ulang aplikasi.
 */
export async function resetLocalDataForDev() {
  await Promise.all([TOKEN_KEY, GUEST_KEY, ME_KEY, ONBOARDED_KEY].map((key) => setItem(key, null)));
  if (Platform.OS === 'web') globalThis.location?.reload();
  else DevSettings.reload();
}

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
  /** Sudah pernah melewati layar pengenalan (atau sudah login / memilih mode tamu). */
  onboarded: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  completeOnboarding: () => void;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);
  const [onboarded, setOnboarded] = useState(false);

  const completeOnboarding = useCallback(() => {
    setOnboarded(true);
    void setItem(ONBOARDED_KEY, '1').catch(() => undefined);
  }, []);

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
      const seenIntro = await getItem(ONBOARDED_KEY).catch(() => null);
      const token = await getItem(TOKEN_KEY);
      if (!token) {
        const guest = await getItem(GUEST_KEY);
        // Sudah jadi tamu = sudah pernah masuk ke aplikasi, jadi tidak perlu pengenalan lagi.
        setOnboarded(!!seenIntro || !!guest);
        return setStatus(guest ? 'guest' : 'signedOut');
      }

      setOnboarded(true);
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
      completeOnboarding();
      setUser(signedInUser);
      await refresh().catch(() => undefined);
      setStatus('signedIn');
    },
    [refresh, completeOnboarding],
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
    completeOnboarding();
    setStatus('guest');
  }, [completeOnboarding]);

  const value = useMemo(
    () => ({ status, user, loyalty, onboarded, signIn, signOut, continueAsGuest, completeOnboarding, refresh, setUser }),
    [status, user, loyalty, onboarded, signIn, signOut, continueAsGuest, completeOnboarding, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession harus dipakai di dalam <SessionProvider>');
  return ctx;
}
