import * as Clipboard from 'expo-clipboard';
import { useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ErrorState } from '@/components/state';
import { useToast } from '@/components/toast';
import { Banner, Loading, ScreenHeader, Txt } from '@/components/ui';
import { voucherPlace } from '@/components/voucher-card';
import { VoucherScanCode } from '@/components/voucher-scan-code';
import { colors } from '@/constants/theme';
import { number, rupiah, shortDate } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import type { Voucher } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function VoucherScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, reload } = useApi<{ data: Voucher }>(`/me/vouchers/${id}`);
  const voucher = data?.data;
  const active = voucher?.status === 'active';
  const focused = useIsFocused();
  const toast = useToast();

  async function copyCode() {
    if (!voucher) return;
    await Clipboard.setStringAsync(voucher.code);
    haptics.tap();
    toast.show('Kode voucher disalin', 'success');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.primaryDark }} edges={['top']}>
      {focused && <StatusBar style="light" />}
      <ScreenHeader title="Voucher" dark />
      {error && !voucher ? (
        <ErrorState dark message={error} onRetry={reload} />
      ) : !voucher ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.card}>
            <Txt weight="extrabold" size={34} style={{ letterSpacing: -0.8 }}>
              {rupiah(voucher.value)}
            </Txt>
            <Txt size={13} color={colors.muted} style={{ textAlign: 'center' }}>
              {voucherPlace(voucher)} · {source(voucher)}
            </Txt>

            {active ? (
              // Kode statis: kasir di POS mana pun (iSeller, Moka, Majoo, Olsera, ...) men-scan QR/barcode-nya atau mengetik kodenya.
              <View style={styles.codeBox} accessible accessibilityLabel={`Kode voucher ${voucher.code.split('').join(' ')}`}>
                <VoucherScanCode code={voucher.code} />
                <Txt weight="extrabold" size={28} selectable style={{ letterSpacing: 3 }} numberOfLines={1} adjustsFontSizeToFit>
                  {voucher.code}
                </Txt>
                <Pressable accessibilityRole="button" accessibilityLabel="Salin kode voucher" onPress={copyCode} hitSlop={8} style={({ pressed }) => [styles.copy, pressed && { opacity: 0.6 }]}>
                  <Icon name="copy" size={16} color={colors.accentText} strokeWidth={2} />
                  <Txt weight="bold" size={13} color={colors.accentText}>
                    Salin kode
                  </Txt>
                </Pressable>
              </View>
            ) : (
              <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
                <Banner text={voucher.status === 'used' ? `Voucher sudah dipakai ${shortDate(voucher.used_at!)}${voucher.used_outlet ? ` di ${voucher.used_outlet}` : ''}.` : 'Voucher sudah kedaluwarsa.'} />
              </View>
            )}

            <Txt size={12} color={colors.muted} style={{ textAlign: 'center' }}>
              {voucher.min_spend > 0 ? `Min. belanja ${rupiah(voucher.min_spend)}` : 'Tanpa minimal belanja'} · Berlaku s.d. {shortDate(voucher.expires_at)}
            </Txt>
          </View>

          {active && (
            <View style={styles.steps}>
              {['Tunjukkan ke kasir sebelum membayar: kasir bisa scan QR, scan barcode, atau ketik kodenya.', 'Tagihan langsung terpotong. Satu voucher untuk satu struk.', 'Foto struknya di tab Foto Struk untuk dapat poin.'].map((step, i) => (
                <View key={step} style={styles.step}>
                  <View style={styles.stepNo}>
                    <Txt weight="bold" size={12} color={colors.accentInk}>
                      {i + 1}
                    </Txt>
                  </View>
                  <Txt size={13} color={colors.onPrimaryMuted} style={{ flex: 1, lineHeight: 19 }}>
                    {step}
                  </Txt>
                </View>
              ))}
            </View>
          )}

          {voucher.terms ? (
            <Txt size={12} color={colors.subtle} style={{ lineHeight: 18, paddingHorizontal: 4 }}>
              Syarat: {voucher.terms}
            </Txt>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** Asal voucher, mis. "Klaim gratis" atau "Tukar 2.500 poin". */
function source(voucher: Voucher): string {
  if (voucher.points_spent > 0) return `Tukar ${number(voucher.points_spent)} poin`;
  if (voucher.paid_amount > 0) return `Dibeli ${rupiah(voucher.paid_amount)}`;
  return voucher.source_label;
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingTop: 4, paddingBottom: 48, gap: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 24, paddingVertical: 28, paddingHorizontal: 22, alignItems: 'center', gap: 6 },
  codeBox: { alignSelf: 'stretch', alignItems: 'center', marginVertical: 14, paddingVertical: 16, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accentLine, backgroundColor: colors.accentSoft, gap: 12 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accentLine },
  steps: { gap: 14, paddingHorizontal: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNo: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
