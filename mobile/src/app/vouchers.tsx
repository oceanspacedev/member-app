import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VoucherListSkeleton } from '@/components/skeleton';
import { EmptyState, ErrorState } from '@/components/state';
import { ScreenHeader, Segmented } from '@/components/ui';
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
      <Segmented
        options={[
          { value: 'active', label: 'Aktif' },
          { value: 'history', label: 'Riwayat' },
        ]}
        value={tab}
        onChange={setTab}
        style={{ marginHorizontal: 16, marginBottom: 12 }}
      />

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <VoucherListSkeleton />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(v) => String(v.id)}
          renderItem={({ item }) => <VoucherCard voucher={item} />}
          contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 48, gap: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
          ListEmptyComponent={
            tab === 'active' ? (
              <EmptyState
                icon="ticket"
                title="Belum ada voucher aktif"
                text="Klaim voucher gratis atau tukar poinmu dengan voucher di halaman Promo."
                action={{ label: 'Lihat promo', onPress: () => router.navigate('/promo') }}
              />
            ) : (
              <EmptyState icon="clock" title="Belum ada riwayat" text="Voucher yang sudah dipakai atau kedaluwarsa muncul di sini." />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}
