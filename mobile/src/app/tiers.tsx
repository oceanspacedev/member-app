import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { TierCard } from '@/components/member-card';
import { Button, Loading, ScreenHeader, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { rupiah } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Tier } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** Level member (Silver/Gold/Platinum): cara kerja dan benefit tiap level. */
export default function TiersScreen() {
  const { status, loyalty } = useSession();
  const { data } = useApi<{ point_value: number; tiers: Tier[] }>('/tiers');
  const tiers = data?.tiers ?? [];
  const currentIndex = tiers.findIndex((t) => t.key === loyalty?.tier);

  const how: [IconName, string][] = [
    ['receipt', 'Foto struk setiap belanja di outlet Ocean Space. Struk diperiksa otomatis dan poin langsung masuk sesuai cashback level kamu.'],
    ['coins', `1 poin = ${rupiah(data?.point_value ?? 10)}. Tukar di kasir atau dengan voucher di semua brand grup.`],
    ['crown', 'Level dihitung dari total belanja 12 bulan terakhir dan naik otomatis.'],
  ];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScreenHeader title="Level Member" />
      {!data ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {loyalty && (
            <View style={styles.summary}>
              <Txt size={13} color={colors.muted}>
                Level kamu sekarang
              </Txt>
              <Txt weight="extrabold" size={22}>
                {loyalty.tier_label} · cashback {loyalty.cashback_percent}%
              </Txt>
              <Txt size={13} color={colors.inkSoft} style={{ lineHeight: 19 }}>
                Belanja 12 bulan terakhir {rupiah(loyalty.annual_spend)}.
                {loyalty.next_tier_label ? ` Tambah ${rupiah(loyalty.spend_to_next_tier)} lagi untuk naik ke ${loyalty.next_tier_label}.` : ' Kamu sudah di level tertinggi.'}
              </Txt>
            </View>
          )}

          <View style={{ gap: 12 }}>
            {tiers.map((t, i) => {
              const status = i === currentIndex ? 'current' : i < currentIndex ? 'reached' : i === currentIndex + 1 ? 'next' : 'locked';
              return <TierCard key={t.key} tier={t} status={status} remaining={status === 'next' ? loyalty?.spend_to_next_tier : undefined} />;
            })}
          </View>

          <View style={{ gap: 12 }}>
            <Txt weight="extrabold" size={16} accessibilityRole="header">
              Cara kerjanya
            </Txt>
            {how.map(([icon, text]) => (
              <View key={icon} style={styles.how}>
                <View style={styles.howIcon}>
                  <Icon name={icon} size={20} color={colors.ink} strokeWidth={1.8} />
                </View>
                <Txt size={13} color={colors.inkSoft} style={{ flex: 1, lineHeight: 19 }}>
                  {text}
                </Txt>
              </View>
            ))}
          </View>

          {status === 'guest' ? (
            <Button title="Masuk untuk mulai kumpulkan poin" variant="brass" onPress={() => router.push('/login')} />
          ) : (
            <Button title="Lihat riwayat poin" variant="secondary" onPress={() => router.push('/points')} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingTop: 4, paddingBottom: 48, gap: 24 },
  summary: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 4 },
  how: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  howIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
});
