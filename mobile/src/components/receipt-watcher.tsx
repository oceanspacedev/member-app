import { useEffect } from 'react';

import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { number } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { receiptWatch, useTrackedReceipts } from '@/lib/receipt-watch';
import { useSession } from '@/lib/session';
import type { ReceiptClaim } from '@/lib/types';

const POLL_MS = 2500;
// Setelah batas ini member tidak perlu menunggu lagi: struk dianggap dicek petugas, hasilnya lewat WhatsApp.
const MAX_WAIT_MS = 75_000;

/**
 * Memantau struk yang masih diperiksa sistem, di layar mana pun member berada. Saat hasilnya keluar, poin
 * disegarkan dan member dikabari lewat toast (kecuali hasilnya sedang tampil di layar Foto Struk).
 */
export function ReceiptWatcher() {
  const { status, refresh } = useSession();
  const { show } = useToast();
  const tracked = useTrackedReceipts();
  const pending = Object.values(tracked)
    .filter((t) => t.claim.checking)
    .map((t) => t.claim.id)
    .join(',');

  // Keluar akun: lupakan struk akun sebelumnya.
  useEffect(() => {
    if (status !== 'signedIn') receiptWatch.clear();
  }, [status]);

  useEffect(() => {
    if (!pending) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const finish = (claim: ReceiptClaim) => {
      receiptWatch.update(claim);
      if (claim.status === 'approved') void refresh().catch(() => undefined);
      if (receiptWatch.isOnScreen(claim.id)) return;

      const outlet = claim.outlet?.name ? ` ${claim.outlet.name}` : '';
      if (claim.status === 'approved') {
        haptics.success();
        show(`+${number(claim.points ?? 0)} poin dari struk${outlet} sudah masuk`, 'success', 4500);
      } else if (claim.status === 'rejected') {
        haptics.warning();
        show(`Struk${outlet} belum bisa diproses. ${claim.reject_reason ?? 'Coba foto ulang struknya.'}`, 'error', 7000);
      } else {
        show('Struk sedang dicek petugas. Hasilnya kami kirim lewat WhatsApp.', 'info', 4500);
      }
    };

    const poll = async () => {
      for (const id of pending.split(',').map(Number)) {
        const entry = receiptWatch.get(id);
        if (!entry?.claim.checking) continue;
        try {
          const res = await api<{ data: ReceiptClaim }>(`/me/receipts/${id}`);
          if (stopped) return;
          if (!res.data.checking) {
            finish(res.data);
            continue;
          }
        } catch {
          // Sinyal putus sesaat: coba lagi di putaran berikutnya.
        }
        if (stopped) return;
        if (Date.now() - entry.since > MAX_WAIT_MS) finish({ ...entry.claim, checking: false, in_review: true });
      }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    };
    timer = setTimeout(poll, POLL_MS);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [pending, refresh, show]);

  return null;
}
