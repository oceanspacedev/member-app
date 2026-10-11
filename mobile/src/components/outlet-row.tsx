import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { jam } from '@/lib/format';
import type { Outlet } from '@/lib/types';

import { Photo } from './media';
import { Txt } from './ui';

const THUMB_W = 88;

/** Baris outlet ringkas: foto kecil di kiri, nama/kategori/status di kanan. */
export function OutletRow({ outlet }: { outlet: Outlet }) {
  const statusColor = outlet.status.open ? colors.success : colors.danger;
  const status = outlet.status.open
    ? `Buka · tutup ${jam(outlet.status.closes_at)}`
    : outlet.status.opens_at
      ? `Tutup · buka ${jam(outlet.status.opens_at)}`
      : 'Tutup hari ini';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/outlet/${outlet.id}`)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.lineSoft }]}>
      <View style={styles.thumb}>
        {outlet.photo_url && <Photo uri={outlet.photo_url} label={`Suasana ${outlet.name}`} style={StyleSheet.absoluteFill} />}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Txt weight="bold" size={15} numberOfLines={1} style={{ flex: 1 }}>
            {outlet.name}
          </Txt>
          {outlet.distance_km !== null && (
            <Txt size={12} color={colors.muted}>
              {outlet.distance_km.toString().replace('.', ',')} km
            </Txt>
          )}
        </View>
        <Txt size={13} color={colors.muted} numberOfLines={1}>
          {outlet.brand?.category_label}
          {outlet.city ? ` · ${outlet.city}` : ''}
        </Txt>
        <Txt weight="semibold" size={12} color={statusColor}>
          {status}
        </Txt>
      </View>
    </Pressable>
  );
}

export function OutletSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  thumb: { width: THUMB_W, height: 66, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.lineSoft },
  separator: { height: 1, backgroundColor: colors.line, marginLeft: 16 + THUMB_W + 14, marginRight: 16 },
});
