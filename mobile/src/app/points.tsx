import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { BrandAvatar } from '@/components/media';
import { EmptyState } from '@/components/state';
import { Banner, Button, Card, ScreenHeader, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { number, rupiah, shortDate } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Loyalty, Paginated, PointTransaction, ReceiptClaim } from '@/lib/types';
import { useApi } from '@/lib/use-api';

type HistoryPage = Paginated<PointTransaction> & { loyalty: Loyalty };

export default function PointsScreen() {
  const { loyalty: sessionLoyalty } = useSession();
  const [items, setItems] = useState<PointTransaction[]>([]);
  const [loyalty, setLoyalty] = useState<Loyalty | null>(sessionLoyalty);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Struk yang dikirim member (outlet dengan POS pihak ketiga); dimuat ulang setiap layar dibuka.
  const receipts = useApi<{ data: ReceiptClaim[] }>('/me/receipts');
  const reloadReceipts = receipts.reload;
  useFocusEffect(useCallback(() => reloadReceipts(), [reloadReceipts]));
  const recentReceipts = (receipts.data?.data ?? []).slice(0, 5);

  const apply = useCallback((res: HistoryPage) => {
    setItems((prev) => (res.meta.current_page === 1 ? res.data : [...prev, ...res.data]));
    setLoyalty(res.loyalty);
    setPage(res.meta.current_page);
    setLastPage(res.meta.last_page);
    setLoading(false);
  }, []);

  const fail = useCallback((e: unknown) => {
    setError(e instanceof ApiError ? e.message : 'Gagal memuat riwayat.');
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<HistoryPage>('/me/points', { query: { page: 1 } }).then(
      (res) => !cancelled && apply(res),
      (e) => !cancelled && fail(e),
    );
    return () => {
      cancelled = true;
    };
  }, [apply, fail]);

  function loadMore() {
    if (loading || page >= lastPage) return;
    setLoading(true);
    api<HistoryPage>('/me/points', { query: { page: page + 1 } }).then(apply, fail);
  }

  const header = (
    <View style={{ gap: 20, marginBottom: 12 }}>
      {loyalty && (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Txt size={12} color={colors.muted}>
                Saldo poin
              </Txt>
              <Txt weight="extrabold" size={30} style={{ letterSpacing: -0.6 }}>
                {number(loyalty.points_balance)}
              </Txt>
            </View>
            <View style={styles.tierPill}>
              <Txt weight="extrabold" size={11} color={colors.accentText} style={{ letterSpacing: 1 }}>
                {loyalty.tier_label.toUpperCase()}
              </Txt>
            </View>
          </View>
          <Txt size={12} color={colors.muted} style={{ lineHeight: 18 }}>
            Setara {rupiah(loyalty.points_value)} · Belanja 12 bulan terakhir {rupiah(loyalty.annual_spend)}. Poin bisa ditukar di semua brand
            grup.
          </Txt>
        </Card>
      )}

      <Pressable accessibilityRole="link" onPress={() => router.push('/tiers')} style={({ pressed }) => [styles.tiersLink, pressed && { opacity: 0.8 }]}>
        <Icon name="crown" size={22} color={colors.accentText} strokeWidth={1.8} />
        <View style={{ flex: 1 }}>
          <Txt weight="bold" size={14}>
            Level & benefit member
          </Txt>
          <Txt size={12} color={colors.muted}>
            {loyalty?.next_tier_label ? `${rupiah(loyalty.spend_to_next_tier)} lagi ke ${loyalty.next_tier_label}` : 'Silver, Gold, Platinum'}
          </Txt>
        </View>
        <Icon name="chevron" size={18} color={colors.subtle} strokeWidth={2} />
      </Pressable>

      <View style={{ gap: 10 }}>
        <Button title="Kirim struk belanja" icon="camera" variant="brass" onPress={() => router.navigate('/struk')} />
        <Txt size={12} color={colors.muted} style={{ lineHeight: 18 }}>
          Belanja di outlet tapi belum dapat poin? Foto struknya, poin langsung masuk setelah diperiksa.
        </Txt>
        {recentReceipts.length > 0 && (
          <View style={styles.receipts}>
            {recentReceipts.map((r, i) => (
              <View key={r.id} style={[styles.receiptRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.lineSoft }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt weight="bold" size={13}>
                    {r.outlet?.name ?? 'Struk belanja'}
                    {r.amount != null ? ` · ${rupiah(r.amount)}` : ''}
                  </Txt>
                  <Txt size={12} color={r.status === 'rejected' ? colors.danger : colors.muted}>
                    {r.status === 'rejected' && r.reject_reason
                      ? r.reject_reason
                      : r.in_review
                        ? `Dikirim ${shortDate(r.created_at)} · dicek petugas, hasil lewat WhatsApp`
                        : r.receipt_number
                          ? `Struk ${r.receipt_number}${r.purchased_at ? ` · ${shortDate(r.purchased_at)}` : ''}`
                          : `Dikirim ${shortDate(r.created_at)} · sedang diperiksa`}
                  </Txt>
                </View>
                <View style={[styles.status, r.status === 'approved' ? styles.approved : r.status === 'rejected' ? styles.rejected : styles.pending]}>
                  <Txt weight="bold" size={11} color={r.status === 'approved' ? colors.success : r.status === 'rejected' ? colors.danger : colors.accentText}>
                    {r.status === 'approved' && r.points != null ? `+${number(r.points)} poin` : r.status_label}
                  </Txt>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <Txt weight="extrabold" size={16} accessibilityRole="header">
        Riwayat poin
      </Txt>
      {error && <Banner tone="error" text={error} />}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScreenHeader title="Poin & Tier" />
      <FlatList
        data={items}
        keyExtractor={(t) => String(t.id)}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="receipt"
              title="Belum ada transaksi"
              text="Foto struk belanjamu di outlet Space Club untuk mulai mengumpulkan poin."
              style={{ paddingVertical: 24 }}
            />
          )
        }
        renderItem={({ item, index }) => {
          const positive = item.points >= 0;
          return (
            <View style={[styles.row, index === 0 && styles.first, index === items.length - 1 && styles.last]}>
              <BrandAvatar name={item.outlet?.brand ?? 'Space Club'} logoUrl={item.outlet?.logo_url} size={36} radius={10} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt weight="bold" size={13}>
                  {item.outlet?.name ?? 'Space Club'}
                </Txt>
                <Txt size={12} color={colors.muted}>
                  {item.type === 'earn' ? `Belanja ${rupiah(item.amount)}` : item.type === 'redeem' ? `Potongan ${rupiah(item.amount)}` : item.description}
                  {' · '}
                  {shortDate(item.created_at)}
                </Txt>
              </View>
              <Txt weight="extrabold" size={14} color={positive ? colors.success : colors.danger}>
                {positive ? '+' : ''}
                {number(item.points)}
              </Txt>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  receipts: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  status: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pending: { backgroundColor: colors.accentSoft },
  approved: { backgroundColor: '#E7F4EC' },
  rejected: { backgroundColor: '#FBECE8' },
  tierPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.accentSoft },
  tiersLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  first: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopColor: colors.line },
  last: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, borderBottomWidth: 1 },
});
