import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Banner, Button, Loading, ScreenHeader, Txt } from '@/components/ui';
import { voucherPlace } from '@/components/voucher-card';
import { colors } from '@/constants/theme';
import { number, rupiah, shortDate } from '@/lib/format';
import type { Voucher } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { countdown, useRotatingQr } from '@/lib/use-rotating-qr';

export default function VoucherScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = useApi<{ data: Voucher }>(`/me/vouchers/${id}`);
  const voucher = data?.data;
  const active = voucher?.status === 'active';
  const qr = useRotatingQr(active ? `/me/vouchers/${id}/qr` : null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.primaryDark }} edges={['top']}>
      <ScreenHeader title="Voucher" dark />
      {error ? (
        <View style={{ padding: 16 }}>
          <Banner tone="error" text={error} />
        </View>
      ) : !voucher ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.card}>
            <Txt weight="extrabold" size={11} color={colors.muted} style={{ letterSpacing: 0.6 }}>
              {voucherPlace(voucher).toUpperCase()}
            </Txt>
            <Txt weight="extrabold" size={18} style={{ textAlign: 'center', lineHeight: 24 }}>
              {voucher.title}
            </Txt>
            <Txt weight="extrabold" size={28} color={colors.primary} style={{ letterSpacing: -0.6 }}>
              {rupiah(voucher.value)}
            </Txt>

            {active ? (
              <>
                <View style={styles.qrBox} accessible accessibilityRole="image" accessibilityLabel="Kode QR voucher untuk dipindai kasir">
                  {qr.qr ? <QRCode value={qr.qr.payload} size={200} color={colors.ink} backgroundColor="#FFFFFF" ecl="M" /> : qr.error ? null : <Loading />}
                </View>
                <Txt weight="extrabold" size={17} style={{ letterSpacing: 1.5 }}>
                  {voucher.code}
                </Txt>
                {qr.qr && (
                  <View style={styles.timer}>
                    <Icon name="refresh" size={16} color={colors.accentText} strokeWidth={2} />
                    <Txt weight="bold" size={12} color={colors.accentText}>
                      QR diperbarui dalam {countdown(qr.secondsLeft)}
                    </Txt>
                  </View>
                )}
                {qr.error && (
                  <View style={{ alignSelf: 'stretch', gap: 10 }}>
                    <Banner tone="error" text={qr.error} />
                    <Button title="Coba lagi" variant="outline" onPress={qr.reload} />
                  </View>
                )}
              </>
            ) : (
              <Banner text={voucher.status === 'used' ? `Voucher sudah dipakai ${shortDate(voucher.used_at!)}${voucher.used_outlet ? ` di ${voucher.used_outlet}` : ''}.` : 'Voucher sudah kedaluwarsa.'} />
            )}

            <View style={styles.facts}>
              {[
                ['Minimal belanja', voucher.min_spend > 0 ? rupiah(voucher.min_spend) : 'Tanpa minimal'],
                ['Berlaku s.d.', shortDate(voucher.expires_at)],
                ['Didapat dari', voucher.points_spent > 0 ? `${voucher.source_label} (${number(voucher.points_spent)} poin)` : voucher.paid_amount > 0 ? `${voucher.source_label} (${rupiah(voucher.paid_amount)})` : voucher.source_label],
              ].map(([k, v], i) => (
                <View key={k} style={[styles.fact, i > 0 && styles.divider]}>
                  <Txt size={13} color={colors.muted}>
                    {k}
                  </Txt>
                  <Txt weight="semibold" size={13} style={{ flexShrink: 1, textAlign: 'right' }}>
                    {v}
                  </Txt>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.howTo}>
            <Txt weight="extrabold" size={15} color="#FFFFFF">
              Cara pakai
            </Txt>
            <Txt size={13} color={colors.onPrimaryMuted} style={{ lineHeight: 20 }}>
              Tunjukkan QR ini ke kasir sebelum membayar. Tagihan terpotong {rupiah(voucher.value)}, lalu poin masuk dari sisa yang kamu bayar. Satu voucher untuk satu struk.
            </Txt>
            {voucher.terms ? (
              <Txt size={12} color={colors.onPrimaryMuted} style={{ lineHeight: 18 }}>
                {voucher.terms}
              </Txt>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingTop: 4, paddingBottom: 48, gap: 18 },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 22, alignItems: 'center', gap: 12 },
  qrBox: { width: 224, height: 224, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.accentSoft },
  facts: { alignSelf: 'stretch', borderTopWidth: 1, borderTopColor: colors.lineSoft, marginTop: 4 },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 11 },
  divider: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  howTo: { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primaryLine, borderRadius: 20, padding: 16, gap: 10 },
});
