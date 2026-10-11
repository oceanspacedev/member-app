import { router, useIsFocused, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { LogoGlyph } from '@/components/logo';
import { MenuIcon, type MenuIconName } from '@/components/menu-icon';
import { OutletRow, OutletSeparator } from '@/components/outlet-row';
import { PromoCarousel } from '@/components/promo-carousel';
import { Txt } from '@/components/ui';
import { WordReveal } from '@/components/word-reveal';
import { colors } from '@/constants/theme';
import { greeting, number, rupiah, rupiahShort } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Outlet, Promo } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { useLocation } from '@/lib/use-location';

type MenuItem = { label: string; icon: MenuIconName; href: Href; badge?: number };

export default function HomeScreen() {
  const { user, loyalty, refresh } = useSession();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const location = useLocation();
  const promos = useApi<{ data: Promo[] }>('/promos');
  const outlets = useApi<{ data: Outlet[] }>('/outlets', { lat: location.coords?.lat, lng: location.coords?.lng });
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    promos.reload();
    outlets.reload();
    await refresh().catch(() => undefined);
    setRefreshing(false);
  }

  if (!user) return null;

  const firstName = user.name?.split(' ')[0] ?? '';
  const hello = `Halo, ${firstName}`;
  const nearby = (outlets.data?.data ?? []).slice(0, 3);
  const allPromos = promos.data?.data ?? [];
  const rewards = allPromos.filter((p) => p.voucher?.price_points != null);
  const progress = loyalty?.next_tier_spend ? Math.min(1, loyalty.annual_spend / loyalty.next_tier_spend) : 1;

  // Delapan menu member, sesuai fitur di dokumen rancangan.
  const menu: MenuItem[] = [
    { label: 'Voucher Saya', icon: 'vouchers', href: '/vouchers', badge: loyalty?.active_vouchers },
    { label: 'Beli Voucher', icon: 'buy', href: { pathname: '/promo', params: { jenis: 'voucher' } } },
    { label: 'Tukar Poin', icon: 'points', href: { pathname: '/promo', params: { jenis: 'poin' } } },
    { label: 'Promo', icon: 'promo', href: { pathname: '/promo', params: { jenis: '' } } },
    { label: 'Outlet', icon: 'outlet', href: '/outlets' },
    { label: 'Brand Grup', icon: 'brands', href: '/brands' },
    { label: 'Riwayat Poin', icon: 'history', href: '/points' },
    { label: 'Level Member', icon: 'level', href: '/tiers' },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Header gelap: teks status bar putih hanya selama Beranda tampil. */}
      {focused && <StatusBar style="light" />}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <View style={styles.headerRow}>
            <View style={styles.logo}>
              <LogoGlyph size={26} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <WordReveal text={hello} size={14} color={colors.onPrimaryMuted} />
              <WordReveal text={greeting().replace(',', '')} size={18} weight="extrabold" color="#FFFFFF" header delay={hello.split(' ').length * 110 + 60} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${loyalty?.tier_label ?? ''}, ${number(loyalty?.points_balance ?? user.points_balance)} poin. Buka riwayat poin.`}
              onPress={() => router.push('/points')}
              style={({ pressed }) => [styles.pointsPill, pressed && { opacity: 0.9 }]}>
              <View>
                <Txt weight="extrabold" size={11} color={colors.accentText} style={{ letterSpacing: 1 }}>
                  {(loyalty?.tier_label ?? user.tier).toUpperCase()}
                </Txt>
                <Txt weight="extrabold" size={16}>
                  {number(loyalty?.points_balance ?? user.points_balance)} Poin
                </Txt>
              </View>
              <Icon name="chevron" size={18} color={colors.muted} strokeWidth={2.2} />
            </Pressable>
          </View>

          {loyalty && (
            <Pressable accessibilityRole="link" onPress={() => router.push('/tiers')} style={{ gap: 8 }} hitSlop={6}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(progress * 100, 2)}%` }]} />
              </View>
              <Txt size={12} color={colors.onPrimaryMuted}>
                {loyalty.next_tier_label
                  ? `${rupiah(loyalty.spend_to_next_tier)} lagi ke ${loyalty.next_tier_label} · cashback ${loyalty.cashback_percent}% sekarang`
                  : `Level tertinggi · cashback ${loyalty.cashback_percent}%`}
              </Txt>
            </Pressable>
          )}
        </View>

        <Pressable
          accessibilityRole="search"
          accessibilityLabel="Cari outlet, brand, atau kota"
          onPress={() => router.navigate({ pathname: '/outlets', params: { cari: String(Date.now()) } })}
          style={styles.search}>
          <Icon name="search" size={20} color={colors.muted} strokeWidth={2} />
          <Txt size={14} color={colors.subtle}>
            Cari outlet, brand, atau kota
          </Txt>
        </Pressable>

        <View style={styles.menu}>
          {menu.map((m) => (
            <Pressable
              key={m.label}
              accessibilityRole="button"
              accessibilityLabel={m.badge ? `${m.label}, ${m.badge} aktif` : m.label}
              onPress={() => router.navigate(m.href)}
              style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}>
              <View style={styles.menuIcon}>
                <MenuIcon name={m.icon} size={48} />
                {m.badge ? (
                  <View style={styles.badge}>
                    <Txt weight="extrabold" size={11} color="#FFFFFF">
                      {m.badge}
                    </Txt>
                  </View>
                ) : null}
              </View>
              <Txt weight="semibold" size={12} style={{ textAlign: 'center' }} numberOfLines={2}>
                {m.label}
              </Txt>
            </Pressable>
          ))}
        </View>

        {allPromos.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Promo pilihan" action="Semua promo" onPress={() => router.navigate({ pathname: '/promo', params: { jenis: '' } })} />
            <PromoCarousel promos={allPromos.slice(0, 6)} />
          </View>
        )}

        {rewards.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Katalog hadiah"
              subtitle="Tukar poin kamu dengan voucher di semua brand grup"
              action="Lihat semua"
              onPress={() => router.navigate({ pathname: '/promo', params: { jenis: 'poin' } })}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {rewards.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  onPress={() => router.navigate({ pathname: '/promo', params: { jenis: 'poin' } })}
                  style={styles.reward}>
                  <View style={[styles.rewardValue, { backgroundColor: p.brand?.color ?? colors.primary }]}>
                    <Txt weight="extrabold" size={20} color="#FFFFFF">
                      {rupiahShort(p.voucher!.value)}
                    </Txt>
                    <Txt weight="semibold" size={11} color="#FFFFFF">
                      {p.is_universal ? 'Semua outlet' : p.brand?.name}
                    </Txt>
                  </View>
                  <View style={{ padding: 12, gap: 4 }}>
                    <Txt weight="bold" size={13} numberOfLines={2} style={{ lineHeight: 18 }}>
                      {p.title}
                    </Txt>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Icon name="coins" size={14} color={colors.accentText} strokeWidth={2} />
                      <Txt weight="extrabold" size={13} color={colors.accentText}>
                        {number(p.voucher!.price_points!)} poin
                      </Txt>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {nearby.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title={location.coords ? 'Outlet terdekat' : 'Outlet'} action="Semua outlet" onPress={() => router.navigate('/outlets')} />
            <View>
              {nearby.map((o, i) => (
                <View key={o.id}>
                  {i > 0 && <OutletSeparator />}
                  <OutletRow outlet={o} />
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, subtitle, action, onPress }: { title: string; subtitle?: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt weight="extrabold" size={18} accessibilityRole="header">
          {title}
        </Txt>
        {subtitle && (
          <Txt size={13} color={colors.muted}>
            {subtitle}
          </Txt>
        )}
      </View>
      <Pressable onPress={onPress} accessibilityRole="link" hitSlop={12}>
        <Txt weight="semibold" size={13} color={colors.accentText}>
          {action}
        </Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 18, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryMid, alignItems: 'center', justifyContent: 'center' },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: colors.accent },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  menu: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 20, rowGap: 18 },
  menuItem: { width: '25%', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  menuIcon: { width: 56, height: 52, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.ground,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: 32, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, paddingHorizontal: 16 },
  reward: { width: 200, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  rewardValue: { height: 86, padding: 12, justifyContent: 'flex-end', gap: 2 },
});
