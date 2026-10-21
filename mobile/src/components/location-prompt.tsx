import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';
import { NEEDS_ACTION, type LocationState, type LocationStatus } from '@/lib/use-location';

import { Icon } from './icon';
import { Txt } from './ui';

const web = Platform.OS === 'web';

function copy(status: LocationStatus): { title: string; text: string; action: string | null } | null {
  switch (status) {
    case 'undetermined':
      return {
        title: 'Lihat outlet terdekat',
        text: 'Izinkan akses lokasi agar outlet diurutkan dari yang paling dekat, lengkap dengan jaraknya.',
        action: 'Izinkan lokasi',
      };
    case 'denied':
      return {
        title: 'Akses lokasi belum diizinkan',
        text: 'Outlet tampil tanpa jarak. Izinkan lokasi agar outlet terdekat muncul paling atas.',
        action: 'Izinkan lokasi',
      };
    case 'blocked':
      return web
        ? { title: 'Akses lokasi diblokir', text: 'Izinkan lokasi untuk situs ini lewat ikon gembok di bilah alamat browser.', action: null }
        : {
            title: 'Izin lokasi dimatikan',
            text: 'Buka Pengaturan › Izin › Lokasi, lalu pilih "Izinkan saat aplikasi digunakan".',
            action: 'Buka Pengaturan',
          };
    case 'off':
      return {
        title: 'Lokasi HP sedang mati',
        text: 'Nyalakan lokasi (GPS) di HP untuk melihat outlet terdekat.',
        action: web ? null : Platform.OS === 'android' ? 'Nyalakan lokasi' : 'Buka Pengaturan',
      };
    default:
      return null;
  }
}

/**
 * Kartu izin lokasi sebelum dialog sistem muncul — menjelaskan kegunaannya dulu, lalu tombolnya memicu
 * dialog izin Android/iOS (atau membuka Pengaturan bila izin sudah ditolak permanen).
 */
export function LocationPrompt({ location, style }: { location: LocationState; style?: StyleProp<ViewStyle> }) {
  const [busy, setBusy] = useState(false);
  const content = NEEDS_ACTION.includes(location.status) ? copy(location.status) : null;
  if (!content) return null;

  async function onPress() {
    setBusy(true);
    try {
      await location.request();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, style]}>
      <View style={styles.badge}>
        <Icon name="pin" size={20} color={colors.primary} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt weight="bold" size={14}>
          {content.title}
        </Txt>
        <Txt size={12} color={colors.muted} style={{ lineHeight: 17 }}>
          {content.text}
        </Txt>
        {content.action && (
          <Pressable
            accessibilityRole="button"
            onPress={onPress}
            disabled={busy}
            style={({ pressed }) => [styles.action, (pressed || busy) && { opacity: 0.8 }]}>
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Txt weight="bold" size={13} color="#FFFFFF">
                {content.action}
              </Txt>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentLine,
  },
  badge: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  action: {
    alignSelf: 'flex-start',
    minWidth: 120,
    height: 36,
    marginTop: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
