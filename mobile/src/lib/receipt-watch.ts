import { useSyncExternalStore } from 'react';

import type { ReceiptClaim } from './types';

/**
 * Struk yang baru dikirim dari HP ini beserta hasil terakhirnya. Pemeriksaan berjalan di server, jadi member
 * boleh meninggalkan layar Foto Struk: ReceiptWatcher terus memantau dan mengabari lewat toast.
 */
type Tracked = { claim: ReceiptClaim; since: number };

let tracked: Record<number, Tracked> = {};
// Struk yang sedang tampil di layar Foto Struk: hasilnya sudah terlihat di sana, tidak perlu toast.
let onScreen: number | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const receiptWatch = {
  track(claim: ReceiptClaim) {
    tracked = { ...tracked, [claim.id]: { claim, since: Date.now() } };
    emit();
  },
  update(claim: ReceiptClaim) {
    const entry = tracked[claim.id];
    if (!entry) return;
    tracked = { ...tracked, [claim.id]: { ...entry, claim } };
    emit();
  },
  get(id: number): Tracked | undefined {
    return tracked[id];
  },
  clear() {
    tracked = {};
    emit();
  },
  setOnScreen(id: number | null) {
    onScreen = id;
  },
  isOnScreen(id: number) {
    return onScreen === id;
  },
};

export function useTrackedReceipts() {
  return useSyncExternalStore(subscribe, () => tracked);
}

export function useTrackedReceipt(id: number | null): ReceiptClaim | null {
  const all = useTrackedReceipts();
  return id != null ? (all[id]?.claim ?? null) : null;
}
