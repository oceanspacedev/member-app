import { useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, WhatsAppLogo } from '@/components/icon';
import { BrandAvatar, Photo, Scrim } from '@/components/media';
import { PromoCard } from '@/components/promo-card';
import { ErrorState } from '@/components/state';
import { Card, Loading, ScreenHeader, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { jam } from '@/lib/format';
import type { Outlet, Promo } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const DAYS: [string, string][] = [
  ['mon', 'Senin'],
  ['tue', 'Selasa'],
  ['wed', 'Rabu'],
  ['thu', 'Kamis'],
  ['fri', 'Jumat'],
  ['sat', 'Sabtu'],
  ['sun', 'Minggu'],
];
const TODAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

export default function OutletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useApi<{ data: Outlet }>(`/outlets/${id}`);
  const outlet = data?.data;
  const promos = useApi<{ data: Promo[] }>(outlet?.brand ? '/promos' : null, { brand_id: outlet?.brand?.id });

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader title="Outlet" />
        <ErrorState message={error} onRetry={reload} />
      </SafeAreaView>
    );
  }

  if (loading || !outlet) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader title="Outlet" />
        <Loading />
      </SafeAreaView>
    );
  }

  const color = outlet.brand?.color ?? colors.primary;
  const wa = outlet.whatsapp?.replace(/\D/g, '');
  const actions: { label: string; icon: ReactNode; url: string | null }[] = [
    {
      label: 'Google Maps',
      icon: <Icon name="pin" size={22} color={colors.primary} />,
      url: outlet.maps_url ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(outlet.name)}`,
    },
    { label: 'Telepon', icon: <Icon name="phone" size={22} color={colors.primary} />, url: outlet.phone ? `tel:${outlet.phone}` : null },
    { label: 'WhatsApp', icon: <WhatsAppLogo size={22} />, url: wa ? `https://wa.me/${wa}` : null },
  ];

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
      <View style={{ backgroundColor: color }}>
        {outlet.photo_url && (
          <>
            <Photo uri={outlet.photo_url} label={`Suasana ${outlet.name}`} tint={color} style={StyleSheet.absoluteFill} />
            <Scrim from={0.3} to={0.85} />
          </>
        )}
        <SafeAreaView edges={['top']} style={[styles.hero, outlet.photo_url ? styles.heroPhoto : null]}>
          <ScreenHeader title="" dark />
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: 16 }}>
            {outlet.brand?.logo_url && (
              <View style={styles.logo}>
                <BrandAvatar name={outlet.name} logoUrl={outlet.brand.logo_url} size={56} radius={14} />
              </View>
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <Txt weight="extrabold" size={24} color="#FFFFFF" accessibilityRole="header">
                {outlet.name}
              </Txt>
              <Txt size={13} color="#F1F4EF">
                {outlet.brand?.category_label}
                {outlet.city ? ` · ${outlet.city}` : ''}
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.dot, { backgroundColor: outlet.status.open ? '#5CD39A' : '#F28B6B' }]} />
                <Txt weight="semibold" size={13} color="#FFFFFF">
                  {outlet.status.open ? `Buka · tutup ${jam(outlet.status.closes_at)}` : 'Sedang tutup'}
                  {outlet.distance_km !== null ? ` · ${outlet.distance_km.toString().replace('.', ',')} km` : ''}
                </Txt>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.actions}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            accessibilityRole="link"
            accessibilityState={{ disabled: !a.url }}
            disabled={!a.url}
            onPress={() => a.url && Linking.openURL(a.url)}
            style={[styles.action, !a.url && { opacity: 0.45 }]}>
            {a.icon}
            <Txt weight="bold" size={12}>
              {a.label}
            </Txt>
          </Pressable>
        ))}
      </View>

      <Card style={{ marginHorizontal: 16, gap: 10 }}>
        <Txt weight="extrabold" size={14}>
          Info outlet
        </Txt>
        <Txt size={13} color={colors.inkSoft} style={{ lineHeight: 20 }}>
          {[outlet.address, outlet.city].filter(Boolean).join(', ') || 'Alamat belum tersedia.'}
        </Txt>
        {outlet.opening_hours && (
          <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: colors.lineSoft, paddingTop: 10 }}>
            {DAYS.map(([key, label]) => (
              <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt weight={key === TODAY ? 'extrabold' : 'regular'} size={13}>
                  {label}
                  {key === TODAY ? ' (hari ini)' : ''}
                </Txt>
                <Txt weight={key === TODAY ? 'extrabold' : 'regular'} size={13}>
                  {outlet.opening_hours?.[key] ? outlet.opening_hours[key].replaceAll(':', '.').replace('-', ' – ') : 'Tutup'}
                </Txt>
              </View>
            ))}
          </View>
        )}
      </Card>

      {outlet.menu_url && (
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(outlet.menu_url!)} style={[styles.menu, { marginHorizontal: 16 }]}>
          <Txt weight="bold" size={14} style={{ flex: 1 }}>
            Lihat katalog menu & produk
          </Txt>
          <Icon name="chevron" size={18} color={colors.subtle} strokeWidth={2} />
        </Pressable>
      )}

      {(promos.data?.data.length ?? 0) > 0 && (
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <Txt weight="extrabold" size={14}>
            Promo di outlet ini
          </Txt>
          {promos.data!.data.map((p) => (
            <PromoCard key={p.id} promo={p} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingBottom: 22, gap: 14 },
  heroPhoto: { minHeight: 320, justifyContent: 'space-between' },
  logo: { padding: 4, borderRadius: 18, backgroundColor: '#FFFFFF' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  menu: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
