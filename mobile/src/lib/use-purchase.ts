import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';

import { api, ApiError } from './api';
import type { VoucherOrder } from './types';

const POLL_EVERY = 4_000;
const POLL_FOR = 5 * 60_000;

/**
 * Beli voucher dengan uang: buat tagihan, buka halaman bayar Xendit, lalu cek status berkala.
 * iOS kembali ke aplikasi saat browser ditutup; Android/web langsung kembali — keduanya ditangani polling.
 */
export function usePurchase(promoId: number, openOrderId: number | null, onPaid: () => void) {
  const [order, setOrder] = useState<VoucherOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const check = useCallback(
    async (id: number) => {
      const res = await api<{ data: VoucherOrder }>(`/me/orders/${id}`);
      setOrder(res.data);
      if (res.data.status === 'paid') onPaid();
      return res.data;
    },
    [onPaid],
  );

  /** Mulai bayar, atau lanjutkan tagihan yang masih terbuka. */
  async function pay(fresh = false) {
    setBusy(true);
    setError(null);
    try {
      const current =
        !fresh && order?.status === 'pending'
          ? order
          : !fresh && openOrderId
            ? await check(openOrderId)
            : (await api<{ order: VoucherOrder }>(`/promos/${promoId}/orders`, { method: 'POST' })).order;
      setOrder(current);

      if (current.status !== 'pending' || !current.payment_url) return;

      setPolling(true);
      await WebBrowser.openBrowserAsync(current.payment_url);
      await check(current.id).catch(() => undefined);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Pembayaran tidak bisa dimulai.');
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    const id = order?.id ?? openOrderId;
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await check(id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Status belum bisa dicek.');
    } finally {
      setBusy(false);
    }
  }

  // Cek berkala selama tagihan masih menunggu (maks. 5 menit setelah halaman bayar dibuka).
  useEffect(() => {
    if (!polling || order?.status !== 'pending') return;
    const id = order.id;
    const tick = setInterval(() => void check(id).catch(() => undefined), POLL_EVERY);
    const stop = setTimeout(() => setPolling(false), POLL_FOR);
    return () => {
      clearInterval(tick);
      clearTimeout(stop);
    };
  }, [polling, order, check]);

  return { order, busy, error, pay, refresh };
}
