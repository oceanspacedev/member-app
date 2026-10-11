import { router } from 'expo-router';
import { type ReactNode, useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { number, rupiah } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Promo, Voucher } from '@/lib/types';
import { usePurchase } from '@/lib/use-purchase';

import { Button, Txt } from './ui';

/**
 * Bagian bawah kartu promo voucher: klaim gratis, tukar poin, atau beli (bayar online lewat Xendit).
 */
export function VoucherAction({ promo, onChanged }: { promo: Promo; onChanged?: () => void }) {
  const { loyalty, refresh: refreshSession } = useSession();
  const v = promo.voucher!;
  const [confirmingPoints, setConfirmingPoints] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  const onPaid = useCallback(() => {
    void refreshSession().catch(() => undefined);
    onChanged?.();
  }, [refreshSession, onChanged]);
  const purchase = usePurchase(promo.id, v.open_order_id, onPaid);

  const pricePoints = v.price_points;
  const priceRupiah = v.price_rupiah;
  const balance = loyalty?.points_balance ?? 0;

  async function acquire() {
    setBusy(true);
    setError(null);
    try {
      await api<{ voucher: Voucher }>(`/promos/${promo.id}/vouchers`, { method: 'POST' });
      setClaimed(true);
      setConfirmingPoints(false);
      onPaid();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal mengambil voucher.');
    } finally {
      setBusy(false);
    }
  }

  const terms = [`Potongan ${rupiah(v.value)}`, v.min_spend > 0 ? `min. belanja ${rupiah(v.min_spend)}` : null].filter(Boolean).join(' · ');
  const order = purchase.order;
  const paid = claimed || order?.status === 'paid' || v.state === 'claimed';
  const awaitingPayment = !paid && (order ? order.status === 'pending' : v.state === 'pending');
  const lapsed = !paid && (order?.status === 'expired' || order?.status === 'canceled');

  let body;
  if (paid) {
    body = (
      <Row terms={terms}>
        <Pressable accessibilityRole="link" onPress={() => router.push('/vouchers')} hitSlop={8}>
          <Txt weight="bold" size={13} color={colors.success}>
            {order?.status === 'paid' ? 'Lunas · ke Voucher Saya ›' : claimed ? 'Masuk ke Voucher Saya ›' : 'Ada di Voucher Saya ›'}
          </Txt>
        </Pressable>
      </Row>
    );
  } else if (awaitingPayment) {
    body = (
      <View style={{ gap: 10 }}>
        <Txt size={13} color={colors.inkSoft} style={{ lineHeight: 19 }}>
          Menunggu pembayaran {rupiah(order?.amount ?? priceRupiah ?? 0)}. Status diperbarui otomatis setelah kamu membayar.
        </Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Lanjutkan bayar" onPress={() => purchase.pay()} loading={purchase.busy} style={[styles.cta, { flex: 1 }]} />
          <Button title="Cek status" variant="secondary" onPress={purchase.refresh} disabled={purchase.busy} style={[styles.cta, { flex: 1 }]} />
        </View>
      </View>
    );
  } else if (v.state === 'locked') {
    body = (
      <Row terms={terms}>
        <Status text={`Khusus ${promo.min_tier_label}`} />
      </Row>
    );
  } else if (v.state === 'sold_out') {
    body = (
      <Row terms={terms}>
        <Status text="Kuota habis" />
      </Row>
    );
  } else if (confirmingPoints && pricePoints !== null) {
    body = (
      <View style={{ gap: 10 }}>
        <Txt size={13} color={colors.inkSoft} style={{ lineHeight: 19 }}>
          Tukar {number(pricePoints)} poin dengan voucher ini? Sisa saldo {number(balance - pricePoints)} poin.
        </Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Ya, tukar" variant="brass" onPress={acquire} loading={busy} style={[styles.cta, { flex: 1 }]} />
          <Button title="Batal" variant="secondary" onPress={() => setConfirmingPoints(false)} disabled={busy} style={[styles.cta, { flex: 1 }]} />
        </View>
      </View>
    );
  } else if (priceRupiah !== null) {
    // Dijual: bayar online, dengan opsi tukar poin bila tersedia.
    body = (
      <View style={{ gap: 8 }}>
        <Row terms={terms}>
          <Button
            title={lapsed ? 'Beli lagi' : `Beli ${rupiah(priceRupiah)}`}
            onPress={() => purchase.pay(lapsed)}
            loading={purchase.busy}
            style={styles.cta}
          />
        </Row>
        {lapsed && (
          <Txt size={12} color={colors.muted}>
            Tagihan sebelumnya {order?.status === 'expired' ? 'kedaluwarsa' : 'dibatalkan'}.
          </Txt>
        )}
        {pricePoints !== null && (
          <Pressable
            accessibilityRole="button"
            disabled={balance < pricePoints}
            onPress={() => setConfirmingPoints(true)}
            hitSlop={6}
            style={{ alignSelf: 'flex-start' }}>
            <Txt weight="semibold" size={12} color={balance < pricePoints ? colors.muted : colors.accentText}>
              {balance < pricePoints ? `Atau ${number(pricePoints)} poin (saldo belum cukup)` : `Atau tukar ${number(pricePoints)} poin ›`}
            </Txt>
          </Pressable>
        )}
      </View>
    );
  } else if (pricePoints !== null) {
    body = (
      <Row terms={terms}>
        {balance < pricePoints ? (
          <Status text={`Butuh ${number(pricePoints)} poin`} />
        ) : (
          <Button title={`Tukar ${number(pricePoints)} poin`} variant="brass" onPress={() => setConfirmingPoints(true)} style={styles.cta} />
        )}
      </Row>
    );
  } else {
    body = (
      <Row terms={terms}>
        <Button title="Klaim" onPress={acquire} loading={busy} style={styles.cta} />
      </Row>
    );
  }

  const shownError = error ?? purchase.error;

  return (
    <View style={styles.voucher}>
      {body}
      {v.quota_left !== null && v.quota_left <= 20 && v.state === 'available' && !paid && !awaitingPayment ? (
        <Txt size={11} color={colors.danger}>
          Sisa {number(v.quota_left)} voucher
        </Txt>
      ) : null}
      {shownError && (
        <Txt size={12} color={colors.danger}>
          {shownError}
        </Txt>
      )}
    </View>
  );
}

function Row({ terms, children }: { terms: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Txt weight="semibold" size={12} color={colors.inkSoft} style={{ flex: 1 }}>
        {terms}
      </Txt>
      {children}
    </View>
  );
}

function Status({ text }: { text: string }) {
  return (
    <Txt weight="bold" size={12} color={colors.muted}>
      {text}
    </Txt>
  );
}

const styles = StyleSheet.create({
  voucher: { borderTopWidth: 1, borderTopColor: colors.lineSoft, borderStyle: 'dashed', paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cta: { minHeight: 40, borderRadius: 12, paddingHorizontal: 14 },
});
