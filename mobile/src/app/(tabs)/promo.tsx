import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PromoCard } from '@/components/promo-card';
import { Banner, Chip, Loading, Txt } from '@/components/ui';
import { categories, colors } from '@/constants/theme';
import { useSession } from '@/lib/session';
import type { Promo } from '@/lib/types';
import { useApi } from '@/lib/use-api';

type Jenis = 'voucher' | 'poin';

const JENIS: Record<Jenis, { title: string; chip: string; empty: string; match: (p: Promo) => boolean }> = {
  voucher: { title: 'Voucher', chip: 'Voucher', empty: 'Belum ada voucher di kategori ini.', match: (p) => p.voucher !== null },
  poin: { title: 'Tukar Poin', chip: 'Bisa ditukar poin', empty: 'Belum ada voucher tukar poin di kategori ini.', match: (p) => p.voucher?.price_points != null },
};

export default function PromoScreen() {
  const { loyalty } = useSession();
  const params = useLocalSearchParams<{ jenis?: string }>();
  const [category, setCategory] = useState<string | null>(null);
  const [jenis, setJenis] = useState<Jenis | null>(asJenis(params.jenis));
  const [seenParam, setSeenParam] = useState(params.jenis);
  const { data, error, loading, reload } = useApi<{ data: Promo[] }>('/promos', { category });

  // Menu Beranda (Beli Voucher / Tukar Poin / Promo) mengirim filter lewat parameter.
  if (params.jenis !== seenParam) {
    setSeenParam(params.jenis);
    setJenis(asJenis(params.jenis));
  }

  const filter = jenis ? JENIS[jenis] : null;
  const items = (data?.data ?? []).filter((p) => !filter || filter.match(p));

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt weight="extrabold" size={24} accessibilityRole="header">
            {filter?.title ?? 'Promo'}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Voucher Saya, ${loyalty?.active_vouchers ?? 0} aktif`}
            onPress={() => router.push('/vouchers')}
            style={styles.myVouchers}>
            <Icon name="ticket" size={18} color={colors.primary} />
            <Txt weight="bold" size={13} color={colors.primary}>
              Voucher Saya
            </Txt>
            {(loyalty?.active_vouchers ?? 0) > 0 && (
              <View style={styles.count}>
                <Txt weight="extrabold" size={11} color="#FFFFFF">
                  {loyalty!.active_vouchers}
                </Txt>
              </View>
            )}
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: filter ? 0 : 12 }}>
          <Chip label="Semua" active={category === null} onPress={() => setCategory(null)} />
          {categories.map((c) => (
            <Chip key={c.key} label={c.short} active={category === c.key} onPress={() => setCategory(c.key)} />
          ))}
        </ScrollView>
        {filter && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Hapus filter ${filter.chip}`}
            onPress={() => {
              setJenis(null);
              router.setParams({ jenis: '' });
            }}
            style={styles.filter}>
            <Txt weight="semibold" size={12} color={colors.accentText}>
              {filter.chip}
            </Txt>
            <Txt weight="bold" size={14} color={colors.accentText}>
              ×
            </Txt>
          </Pressable>
        )}
      </View>

      {error ? (
        <View style={{ padding: 16 }}>
          <Banner tone="error" text={error} />
        </View>
      ) : loading && !data ? (
        <Loading />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => <PromoCard promo={item} onChanged={reload} />}
          contentContainerStyle={{ padding: 16, paddingTop: filter ? 12 : 4, paddingBottom: 48, gap: 14 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
          ListEmptyComponent={
            <Txt size={14} color={colors.muted} style={{ textAlign: 'center', marginTop: 24 }}>
              {filter?.empty ?? 'Belum ada promo di kategori ini.'}
            </Txt>
          }
        />
      )}
    </SafeAreaView>
  );
}

function asJenis(value?: string): Jenis | null {
  return value === 'voucher' || value === 'poin' ? value : null;
}

const styles = StyleSheet.create({
  filter: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 32,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentLine,
  },
  myVouchers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  count: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
