import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api, ApiError } from './api';

type Qr = { payload: string; expires_at: number };

// Ambil QR baru sebelum yang lama kedaluwarsa.
const REFRESH_MARGIN = 10;

/**
 * QR bertanda tangan yang berganti berkala (QR member & QR voucher).
 * Hanya berjalan saat layar terlihat; `secondsLeft` sudah dikurangi margin penyegaran.
 */
export function useRotatingQr(path: string | null) {
  const [qr, setQr] = useState<Qr | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [active, setActive] = useState(false);

  const fetching = useRef(false);

  const load = useCallback(async () => {
    if (!path || fetching.current) return;
    fetching.current = true;
    try {
      setQr(await api<Qr>(path));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat QR.');
    } finally {
      fetching.current = false;
    }
  }, [path]);

  useFocusEffect(
    useCallback(() => {
      setActive(true);
      void load();
      return () => setActive(false);
    }, [load]),
  );

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, [active]);

  // Jadwalkan pengambilan QR baru sesaat sebelum yang sekarang kedaluwarsa.
  useEffect(() => {
    if (!active || !qr || error) return;
    const ms = Math.max(0, (qr.expires_at - REFRESH_MARGIN) * 1000 - Date.now());
    const t = setTimeout(() => void load(), ms);
    return () => clearTimeout(t);
  }, [active, qr, error, load]);

  const secondsLeft = qr ? Math.max(0, qr.expires_at - now - REFRESH_MARGIN) : 0;

  return { qr, error, secondsLeft, reload: load };
}

/** 95 → "01:35" */
export function countdown(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
