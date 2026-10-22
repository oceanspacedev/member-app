import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlueGradient } from '@/components/home-hero';
import { Icon } from '@/components/icon';
import { BrandAvatar, Photo } from '@/components/media';
import { MemberQrSheet } from '@/components/member-qr-sheet';
import { OutletRow, OutletSeparator } from '@/components/outlet-row';
import { OutletListSkeleton } from '@/components/skeleton';
import { EmptyState, ErrorState } from '@/components/state';
import { Button, Loading, ScreenHeader, Txt } from '@/components/ui';
import { VoucherAction } from '@/components/voucher-action';
import { colors } from '@/constants/theme';
import { number, rupiah, shortDate } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Outlet, Promo } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { useLocation } from '@/lib/use-location';

type Tab = 'deskripsi' | 'cara' | 'outlet';
const TABS: { key: Tab; label: string }[] = [
  { key: 'deskripsi', label: 'Deskripsi' },
  { key: 'cara', label: 'Cara Pakai' },
  { key: 'outlet', label: 'Outlet' },
];

/** Langkah pemakaian disusun dari jenis promo — admin tidak perlu menulisnya satu per satu. */
function howTo(p: Promo): string[] {
  const where = p.is_universal ? 'outlet Space Club mana pun' : `outlet ${p.brand?.name ?? 'brand ini'}`;
  const v = p.voucher;
  const steps: string[] = [];
  if (!v) {
    steps.push(`Datang ke ${where} selama periode promo.`);
    steps.push('Sebelum membayar, buka Kartu Member (ikon QR di Beranda) lalu tunjukkan ke kasir.');
    steps.push('Promo langsung berlaku dan poin belanja tetap masuk ke akunmu.');
  } else {
    if (p.type === 'claim') steps.push('Ketuk "Klaim" untuk menyimpan voucher ini secara gratis.');
    else {
      const ways = [
        v.price_points != null ? `tukar ${number(v.price_points)} poin` : null,
        v.price_rupiah != null ? `beli seharga ${rupiah(v.price_rupiah)} (QRIS, transfer bank, atau e-wallet)` : null,
      ].filter(Boolean);
      steps.push(`Dapatkan voucher dengan ${ways.join(', atau ')}.`);
    }
    steps.push('Voucher otomatis tersimpan di menu Voucher Saya.');
    steps.push(`Saat membayar di ${where}, tunjukkan QR atau kode voucher ke kasir.`);
    steps.push(
      v.min_spend > 0
        ? `Potongan ${rupiah(v.value)} berlaku untuk minimal belanja ${rupiah(v.min_spend)}.`
        : `Tagihan langsung terpotong ${rupiah(v.value)}.`,
    );
    if (v.valid_days) steps.push(`Voucher berlaku ${v.valid_days} hari setelah diambil.`);
  }
  if (p.min_tier_label) steps.unshift(`Khusus member ${p.min_tier_label} ke atas.`);
  return steps;
}

export default function PromoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status } = useSession();
  const guest = status === 'guest';
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('deskripsi');
  const [cardOpen, setCardOpen] = useState(false);
  const location = useLocation();

  const promos = useApi<{ data: Promo[] }>('/promos');
  const promo = promos.data?.data.find((p) => String(p.id) === id);
  const outlets = useApi<{ data: Outlet[] }>(promo ? '/outlets' : null, {
    brand_id: promo && !promo.is_universal ? promo.brand?.id : null,
    lat: location.coords?.lat,
    lng: location.coords?.lng,
  });

  if (!promo) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader title="Promo" />
        {promos.error && !promos.data ? (
          <ErrorState message={promos.error} onRetry={promos.reload} />
        ) : !promos.data ? (
          <Loading />
        ) : (
          <EmptyState
            icon="tag"
            title="Promo tidak ditemukan"
            text="Promo ini mungkin sudah berakhir atau tidak tersedia lagi."
            action={{
              label: 'Lihat promo lain',
              onPress: () => router.replace({ pathname: '/promo', params: { jenis: '' } }),
            }}
          />
        )}
      </SafeAreaView>
    );
  }

  const where = promo.is_universal ? 'Semua outlet Space Club' : (promo.brand?.name ?? '');
  const list = outlets.data?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <StatusBar style="light" />
      <View style={{ height: insets.top, backgroundColor: colors.primary }} />

      {/* Tab menempel di atas saat digulir (anak ke-3 ScrollView). */}
      <ScrollView stickyHeaderIndices={[2]} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.banner}>
          {promo.image_url ? (
            <Photo uri={promo.image_url} label={promo.title} tint={colors.primarySoft} style={StyleSheet.absoluteFill} />
          ) : (
            <>
              <BlueGradient />
              <View style={styles.bannerText}>
                {promo.highlight ? (
                  <Txt weight="extrabold" size={40} color="#FFFFFF" style={{ letterSpacing: -1 }}>
                    {promo.highlight}
                  </Txt>
                ) : (
                  <Icon name="ticket" size={56} color="#FFFFFF" strokeWidth={1.6} />
                )}
                {promo.highlight_caption ? (
                  <Txt weight="semibold" size={16} color={colors.onPrimaryMuted}>
                    {promo.highlight_caption}
                  </Txt>
                ) : null}
              </View>
            </>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.8 }]}>
            <Icon name="back" size={22} color="#FFFFFF" strokeWidth={2.4} />
          </Pressable>
        </View>

        <View style={styles.info}>
          <View style={styles.brandRow}>
            <BrandAvatar name={where} logoUrl={promo.brand?.logo_url} size={40} radius={10} />
            <Txt weight="bold" size={12} color={colors.muted} style={{ letterSpacing: 0.6, flex: 1 }} numberOfLines={1}>
              {where.toUpperCase()}
            </Txt>
          </View>
          <Txt weight="extrabold" size={20} style={{ lineHeight: 27 }} accessibilityRole="header">
            {promo.title.toUpperCase()}
          </Txt>
          <Txt weight="bold" size={14}>
            Periode :{' '}
            <Txt weight="semibold" size={14} color={colors.accentText}>
              {shortDate(promo.starts_at)} - {shortDate(promo.ends_at)}
            </Txt>
          </Txt>
          {(promo.min_tier_label || promo.voucher) && (
            <View style={styles.chips}>
              {promo.min_tier_label ? (
                <View style={styles.chip}>
                  <Icon name="crown" size={14} color={colors.accentText} strokeWidth={2} />
                  <Txt weight="semibold" size={12} color={colors.accentText}>
                    Khusus {promo.min_tier_label} ke atas
                  </Txt>
                </View>
              ) : null}
              {promo.voucher ? (
                <View style={styles.chip}>
                  <Icon name="ticket" size={14} color={colors.accentText} strokeWidth={2} />
                  <Txt weight="semibold" size={12} color={colors.accentText}>
                    Potongan {rupiah(promo.voucher.value)}
                    {promo.voucher.min_spend > 0 ? ` · min. ${rupiah(promo.voucher.min_spend)}` : ''}
                  </Txt>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Pembungkus wajib: di iOS/Android header sticky mengganti style anaknya dengan flex: 1,
            jadi baris tab (flexDirection: row) harus berada satu tingkat di dalamnya. */}
        <View>
          <View style={styles.tabs} accessibilityRole="tablist">
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <Pressable
                  key={t.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setTab(t.key)}
                  style={styles.tab}>
                  <Txt weight={active ? 'bold' : 'semibold'} size={15} color={active ? colors.primary : colors.subtle}>
                    {t.label}
                  </Txt>
                  {active && <View style={styles.underline} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          {tab === 'deskripsi' && (
            <View style={styles.content}>
              <Txt size={14} color={colors.inkSoft} style={{ lineHeight: 22 }}>
                {promo.description || 'Belum ada deskripsi untuk promo ini.'}
              </Txt>
              {promo.terms ? (
                <View style={{ gap: 6, marginTop: 8 }}>
                  <Txt weight="bold" size={14}>
                    Syarat & ketentuan
                  </Txt>
                  <Txt size={14} color={colors.inkSoft} style={{ lineHeight: 22 }}>
                    {promo.terms}
                  </Txt>
                </View>
              ) : null}
            </View>
          )}

          {tab === 'cara' && (
            <View style={styles.content}>
              {howTo(promo).map((step, i) => (
                <View key={step} style={styles.step}>
                  <View style={styles.stepNo}>
                    <Txt weight="bold" size={13} color={colors.primary}>
                      {i + 1}
                    </Txt>
                  </View>
                  <Txt size={14} color={colors.inkSoft} style={{ flex: 1, lineHeight: 21 }}>
                    {step}
                  </Txt>
                </View>
              ))}
            </View>
          )}

          {tab === 'outlet' && (
            <View style={{ paddingTop: 8 }}>
              <Txt size={13} color={colors.muted} style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
                {promo.is_universal
                  ? 'Berlaku di semua outlet Space Club'
                  : `Berlaku di ${list.length ? `${list.length} ` : ''}outlet ${promo.brand?.name ?? ''}`}
                {location.coords ? ' · diurutkan dari yang terdekat' : ''}
              </Txt>
              {outlets.error && !outlets.data ? (
                <ErrorState message={outlets.error} onRetry={outlets.reload} />
              ) : !outlets.data ? (
                <OutletListSkeleton count={3} />
              ) : list.length === 0 ? (
                <EmptyState icon="pin" title="Belum ada outlet" text="Outlet untuk promo ini belum terdaftar." />
              ) : (
                list.map((o, i) => (
                  <View key={o.id}>
                    {i > 0 && <OutletSeparator />}
                    <OutletRow outlet={o} />
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {promo.voucher ? (
          <VoucherAction promo={promo} onChanged={promos.reload} />
        ) : (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            {guest ? (
              <Button title="Masuk untuk pakai promo" onPress={() => router.push('/login')} />
            ) : (
              <Button title="Tunjukkan Kartu Member" icon="qr" onPress={() => setCardOpen(true)} />
            )}
          </View>
        )}
      </View>

      {!guest && <MemberQrSheet visible={cardOpen} onClose={() => setCardOpen(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  bannerText: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  back: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: 20,
    gap: 12,
    borderBottomWidth: 8,
    borderBottomColor: colors.ground,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tab: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center' },
  underline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  content: { padding: 20, gap: 14 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    boxShadow: `0 -4px 14px ${colors.shadow}`,
  },
});
