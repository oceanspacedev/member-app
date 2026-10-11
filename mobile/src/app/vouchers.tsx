import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner, Button, Chip, Loading, ScreenHeader, Txt } from '@/components/ui';
import { VoucherCard } from '@/components/voucher-card';
import { colors } from '@/constants/theme';
import type { Voucher } from '@/lib/types';
import { useApi } from '@/lib/use-api';

type Tab = 'active' | 'history';

export default function VouchersScreen() {
  const [tab, setTab] = useState<Tab>('active');
  const { data, error, loading, reload } = useApi<{ data: Voucher[] }>('/me/vouchers', { status: tab });

  // Kembali dari kasir/detail: status voucher mungkin sudah berubah.
  useFocusEffect(useCallback(() => reload(), [reload]));

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScreenHeader title="Voucher Saya" />
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Chip label="Aktif" active={tab === 'active'} onPress={() => setTab('active')} />
        <Chip label="Riwayat" active={tab === 'history'} onPress={() => setTab('history')} />
      </View>

      {error ? (
        <View style={{ padding: 16 }}>
          <Banner tone="error" text={error} />
        </View>
      ) : loading && !data ? (
        <Loading />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(v) => String(v.id)}
          renderItem={({ item }) => <VoucherCard voucher={item} />}
          contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 48, gap: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
          ListEmptyComponent={
            tab === 'active' ? (
              <View style={{ alignItems: 'center', gap: 14, marginTop: 32, paddingHorizontal: 24 }}>
                <Txt weight="bold" size={16}>
                  Belum ada voucher aktif
                </Txt>
                <Txt size={14} color={colors.muted} style={{ textAlign: 'center', lineHeight: 20 }}>
                  Klaim voucher gratis atau tukar poinmu dengan voucher di halaman Promo.
                </Txt>
                <Button title="Lihat promo" variant="outline" onPress={() => router.navigate('/promo')} style={{ alignSelf: 'stretch' }} />
              </View>
            ) : (
              <Txt size={14} color={colors.muted} style={{ textAlign: 'center', marginTop: 32 }}>
                Voucher yang sudah dipakai atau kedaluwarsa muncul di sini.
              </Txt>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}
