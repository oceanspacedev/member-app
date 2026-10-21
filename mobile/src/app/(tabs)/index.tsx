import { router, useIsFocused, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ReceiptArt, RewardArt, TierMedal } from '@/components/home-art';
import { BlueGradient, HomeHero, HomeNavbar } from '@/components/home-hero';
import { Icon } from '@/components/icon';
import { LocationPrompt } from '@/components/location-prompt';
import { MemberQrSheet } from '@/components/member-qr-sheet';
import { MenuIcon, type MenuIconName } from '@/components/menu-icon';
import { OutletRow, OutletSeparator } from '@/components/outlet-row';
import { OutletListSkeleton } from '@/components/skeleton';
import { ErrorState } from '@/components/state';
import { Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { number, rupiah, rupiahShort } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Outlet, Promo } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { useLocation } from '@/lib/use-location';

// memberOnly: tamu diarahkan ke login karena halamannya butuh akun.
type MenuItem = { label: string; icon: MenuIconName; href: Href; badge?: number; memberOnly?: boolean };

export default function HomeScreen() {
  const { status, user, loyalty, refresh } = useSession();
  const guest = status === 'guest';
  const focused = useIsFocused();
  const location = useLocation();
  const promos = useApi<{ data: Promo[] }>('/promos');
  const outlets = useApi<{ data: Outlet[] }>('/outlets', { lat: location.coords?.lat, lng: location.coords?.lng });
  const [refreshing, setRefreshing] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    promos.reload();
    outlets.reload();
    if (!guest) await refresh().catch(() => undefined);
    setRefreshing(false);
  }

  if (!user && !guest) return null;

  /** Fitur khusus member: tamu diarahkan ke halaman masuk. */
  const memberOnly = (go: () => void) => () => (guest ? router.push('/login') : go());

  const nearby = (outlets.data?.data ?? []).slice(0, 3);
  const allPromos = promos.data?.data ?? [];
  // Banner: promo berfoto lebih dulu, sisanya tampil dengan latar gradasi biru.
  const heroPromos = [...allPromos.filter((p) => p.image_url), ...allPromos.filter((p) => !p.image_url)];
  const outletsLoading = !outlets.data && !outlets.error;
  const rewards = allPromos.filter((p) => p.voucher?.price_points != null);
  const progress = loyalty?.next_tier_spend ? Math.min(1, loyalty.annual_spend / loyalty.next_tier_spend) : 1;

  const menu: MenuItem[] = [
    { label: 'Voucher Saya', icon: 'vouchers', href: '/vouchers', badge: loyalty?.active_vouchers, memberOnly: true },
    { label: 'Beli Voucher', icon: 'buy', href: { pathname: '/promo', params: { jenis: 'voucher' } } },
    { label: 'Tukar Poin', icon: 'points', href: { pathname: '/promo', params: { jenis: 'poin' } } },
    { label: 'Promo', icon: 'promo', href: { pathname: '/promo', params: { jenis: '' } } },
    { label: 'Outlet', icon: 'outlet', href: '/outlets' },
    { label: 'Brand Grup', icon: 'brands', href: '/brands' },
    { label: 'Riwayat Poin', icon: 'history', href: '/points', memberOnly: true },
    { label: 'Level Member', icon: 'level', href: '/tiers' },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Navbar putih di puncak: teks status bar gelap selama Beranda tampil. */}
      {focused && <StatusBar style="dark" />}

      {/* Di luar ScrollView: navbar tetap terlihat saat Beranda digulir. */}
      <HomeNavbar
        onSearch={() => router.navigate({ pathname: '/outlets', params: { cari: String(Date.now()) } })}
        onMemberCard={memberOnly(() => setCardOpen(true))}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <HomeHero promos={heroPromos} />

        {/* Ringkasan poin & voucher, menumpang di tepi bawah banner. */}
        <View style={styles.summary}>
          <SummaryHalf
            onPress={memberOnly(() => router.push('/points'))}
            label={guest ? 'Tamu' : (loyalty?.tier_label ?? user?.tier ?? '')}
            value={guest ? 'Masuk / Daftar' : `${number(loyalty?.points_balance ?? user?.points_balance ?? 0)} Poin`}
            art={<TierMedal tier={loyalty?.tier ?? user?.tier ?? 'silver'} size={28} />}
          />
          <View style={styles.summaryDivider} />
          <SummaryHalf
            onPress={memberOnly(() => router.push('/vouchers'))}
            label="Voucher"
            value={guest ? 'Masuk dulu' : `${number(loyalty?.active_vouchers ?? 0)} Voucher`}
            art={<MenuIcon name="vouchers" size={28} />}
          />
        </View>

        {/* Promo & outlet gagal dimuat (offline / koneksi lambat): jelaskan dan beri tombol coba lagi. */}
        {(promos.error || outlets.error) && !promos.data && !outlets.data && (
          <ErrorState
            message={(promos.error ?? outlets.error)!}
            onRetry={() => {
              promos.reload();
              outlets.reload();
            }}
          />
        )}

        {/* Dua aksi utama member: kumpulkan poin & pakai poin. */}
        <View style={styles.actions}>
          <ActionCard title="Foto Struk" subtitle="Kirim struk, dapat poin" art={<ReceiptArt size={52} />} onPress={memberOnly(() => router.navigate('/struk'))} />
          <ActionCard
            title="Tukar Poin"
            subtitle="Poin jadi voucher"
            art={<RewardArt size={52} />}
            onPress={() => router.navigate({ pathname: '/promo', params: { jenis: 'poin' } })}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={guest ? () => router.push('/login') : () => router.push('/tiers')}
          style={({ pressed }) => [styles.banner, pressed && { opacity: 0.92 }]}>
          <BlueGradient />
          <View style={styles.bannerBadge}>
            <TierMedal tier={loyalty?.next_tier ?? loyalty?.tier ?? 'gold'} size={34} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Txt weight="extrabold" size={15} color="#FFFFFF" numberOfLines={1}>
              {guest
                ? 'Daftar gratis, langsung dapat poin'
                : loyalty?.next_tier_label
                  ? `${rupiahShort(loyalty.spend_to_next_tier)} lagi ke ${loyalty.next_tier_label}`
                  : `Kamu member ${loyalty?.tier_label ?? ''}`}
            </Txt>
            {!guest && loyalty?.next_tier_label ? (
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(progress * 100, 3)}%` }]} />
              </View>
            ) : (
              <Txt size={12} color={colors.onPrimaryMuted} numberOfLines={1}>
                {guest ? 'Cashback poin di semua brand grup.' : `Cashback ${loyalty?.cashback_percent ?? 0}% · level tertinggi`}
              </Txt>
            )}
          </View>
          <View style={styles.bannerChip}>
            <Txt weight="bold" size={12} color={colors.primary}>
              {guest ? 'Masuk' : 'Benefit'}
            </Txt>
            <Icon name="chevron" size={14} color={colors.primary} strokeWidth={2.4} />
          </View>
        </Pressable>

        <View style={styles.section}>
          <SectionHeader title="Layanan member" />
          <View style={styles.menu}>
            {menu.map((m) => (
              <Pressable
                key={m.label}
                accessibilityRole="button"
                accessibilityLabel={m.badge ? `${m.label}, ${m.badge} aktif` : m.label}
                onPress={() => (guest && m.memberOnly ? router.push('/login') : router.navigate(m.href))}
                style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}>
                <View style={styles.menuIcon}>
                  <MenuIcon name={m.icon} size={44} />
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
        </View>

        {rewards.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Tukar poin" action="Lihat semua" onPress={() => router.navigate({ pathname: '/promo', params: { jenis: 'poin' } })} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {rewards.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  onPress={() => router.navigate({ pathname: '/promo', params: { jenis: 'poin' } })}
                  style={({ pressed }) => [styles.reward, pressed && { opacity: 0.85 }]}>
                  <View style={styles.rewardTop}>
                    <BlueGradient />
                    <Txt weight="extrabold" size={20} color="#FFFFFF" style={{ letterSpacing: -0.4 }}>
                      {rupiahShort(p.voucher!.value)}
                    </Txt>
                    <Txt weight="semibold" size={11} color={colors.onPrimaryMuted} numberOfLines={1}>
                      {p.is_universal ? 'Semua outlet' : p.brand?.name}
                    </Txt>
                  </View>
                  <View style={styles.rewardBottom}>
                    <Txt weight="semibold" size={12} numberOfLines={2} style={{ lineHeight: 16 }}>
                      {p.title}
                    </Txt>
                    <Txt weight="bold" size={13} color={colors.accentText}>
                      {number(p.voucher!.price_points!)} poin
                    </Txt>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {(nearby.length > 0 || outletsLoading) && (
          <View style={styles.section}>
            <SectionHeader title={location.coords ? 'Outlet terdekat' : 'Outlet'} action="Semua outlet" onPress={() => router.navigate('/outlets')} />
            <LocationPrompt location={location} style={{ marginHorizontal: 16 }} />
            <View style={styles.listCard}>
              {outletsLoading ? (
                <OutletListSkeleton count={3} />
              ) : (
                nearby.map((o, i) => (
                  <View key={o.id}>
                    {i > 0 && <OutletSeparator />}
                    <OutletRow outlet={o} />
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {!guest && loyalty && (
          <Txt size={12} color={colors.subtle} style={styles.footnote}>
            Belanja 12 bulan terakhir {rupiah(loyalty.annual_spend)} · cashback {loyalty.cashback_percent}%
          </Txt>
        )}
      </ScrollView>

      <MemberQrSheet visible={cardOpen} onClose={() => setCardOpen(false)} />
    </View>
  );
}

function SummaryHalf({ label, value, art, onPress }: { label: string; value: string; art: ReactNode; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.summaryHalf, pressed && { opacity: 0.7 }]}>
      {art}
      <View style={{ flex: 1 }}>
        <Txt size={13} color={colors.inkSoft} numberOfLines={1} style={{ lineHeight: 17 }}>
          {label}
        </Txt>
        <Txt weight="bold" size={14} numberOfLines={1} style={{ lineHeight: 19 }}>
          {value}
        </Txt>
      </View>
    </Pressable>
  );
}

function ActionCard({ title, subtitle, art, onPress }: { title: string; subtitle: string; art: ReactNode; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}>
      {art}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt weight="extrabold" size={16} numberOfLines={1}>
          {title}
        </Txt>
        <Txt size={12} color={colors.muted} numberOfLines={2}>
          {subtitle}
        </Txt>
      </View>
    </Pressable>
  );
}

function SectionHeader({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Txt weight="extrabold" size={17} accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </Txt>
      {action && onPress && (
        <Pressable onPress={onPress} accessibilityRole="link" hitSlop={12}>
          <Txt weight="semibold" size={13} color={colors.accentText}>
            {action}
          </Txt>
        </Pressable>
      )}
    </View>
  );
}

const card = {
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.line,
  boxShadow: `0 4px 14px ${colors.shadow}`,
} as const;

const styles = StyleSheet.create({
  // Kartu ringkas (±54pt) yang menumpang setengahnya di tepi bawah banner.
  summary: { ...card, flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: -28, paddingVertical: 10 },
  summaryHalf: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 20, paddingRight: 10 },
  summaryDivider: { width: 1, height: 30, backgroundColor: colors.line },
  actions: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 14 },
  action: { ...card, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 12, minHeight: 86 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  bannerChip: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 12, paddingRight: 8, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF' },
  track: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', borderRadius: 3, backgroundColor: '#FFFFFF' },
  section: { marginTop: 26, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  menu: { ...card, flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, paddingVertical: 16, paddingHorizontal: 4, rowGap: 18 },
  menuItem: { width: '25%', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  menuIcon: { width: 52, height: 48, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -4,
    right: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reward: { ...card, width: 168, overflow: 'hidden' },
  rewardTop: { height: 76, justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 10, overflow: 'hidden' },
  rewardBottom: { padding: 12, gap: 6 },
  listCard: { ...card, marginHorizontal: 16, overflow: 'hidden' },
  footnote: { textAlign: 'center', marginTop: 24, paddingHorizontal: 16 },
});
