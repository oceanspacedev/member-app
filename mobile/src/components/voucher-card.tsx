import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { daysUntil, rupiah, rupiahShort, shortDate } from '@/lib/format';
import type { Voucher } from '@/lib/types';

import { Txt } from './ui';

export function voucherPlace(voucher: Voucher): string {
  return voucher.is_universal ? 'Semua outlet' : (voucher.brand?.name ?? 'Brand tertentu');
}

/** Keterangan masa berlaku / pemakaian di bawah judul voucher. */
function statusLine(voucher: Voucher): { text: string; urgent?: boolean } {
  if (voucher.status === 'used') {
    return { text: `Terpakai ${shortDate(voucher.used_at!)}${voucher.used_outlet ? ` di ${voucher.used_outlet}` : ''}` };
  }
  if (voucher.status === 'expired') return { text: `Kedaluwarsa ${shortDate(voucher.expires_at)}` };

  const days = daysUntil(voucher.expires_at);
  if (days === 0) return { text: 'Berakhir hari ini', urgent: true };
  if (days <= 3) return { text: `Berakhir dalam ${days} hari`, urgent: true };
  return { text: `Berlaku s.d. ${shortDate(voucher.expires_at)}` };
}

/** Kartu bergaya tiket: blok nilai di kiri, keterangan di kanan. */
export function VoucherCard({ voucher }: { voucher: Voucher }) {
  const active = voucher.status === 'active';
  const color = active ? (voucher.brand?.color ?? colors.primary) : colors.subtle;
  const status = statusLine(voucher);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${voucher.title}, potongan ${rupiah(voucher.value)}, ${status.text}`}
      accessibilityState={{ disabled: !active }}
      disabled={!active}
      onPress={() => router.push({ pathname: '/voucher/[id]', params: { id: String(voucher.id) } })}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.value, { backgroundColor: color }]}>
        <Txt weight="extrabold" size={rupiahShort(voucher.value).length > 6 ? 16 : 20} color="#FFFFFF" style={{ letterSpacing: -0.4 }} numberOfLines={1}>
          {rupiahShort(voucher.value)}
        </Txt>
        <Txt weight="semibold" size={11} color="#FFFFFF">
          potongan
        </Txt>
      </View>
      <View style={[styles.notch, { top: -8 }]} />
      <View style={[styles.notch, { bottom: -8 }]} />
      <View style={styles.body}>
        <Txt weight="extrabold" size={11} color={colors.muted} style={{ letterSpacing: 0.6 }}>
          {voucherPlace(voucher).toUpperCase()} · {voucher.source_label.toUpperCase()}
        </Txt>
        <Txt weight="bold" size={14} style={{ lineHeight: 19 }} numberOfLines={2}>
          {voucher.title}
        </Txt>
        {voucher.min_spend > 0 && (
          <Txt size={12} color={colors.inkSoft}>
            Min. belanja {rupiah(voucher.min_spend)}
          </Txt>
        )}
        <Txt weight={status.urgent ? 'bold' : 'regular'} size={12} color={status.urgent ? colors.danger : colors.muted}>
          {status.text}
        </Txt>
      </View>
      {active && (
        <Txt weight="bold" size={18} color={colors.subtle} style={{ alignSelf: 'center', paddingRight: 14 }}>
          ›
        </Txt>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  value: { width: 96, padding: 12, justifyContent: 'center', gap: 2 },
  // Lekukan tiket di sambungan blok nilai dan keterangan.
  notch: { position: 'absolute', left: 88, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.ground, borderWidth: 1, borderColor: colors.line },
  body: { flex: 1, padding: 14, gap: 4 },
});
