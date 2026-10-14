import { useNetworkState } from 'expo-network';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

import { Icon } from './icon';
import { Txt } from './ui';

const RESTORED_MS = 2200;

/**
 * Kapsul kecil di bawah status bar saat HP kehilangan internet, lalu "Kembali online" sebentar saat pulih.
 * Tidak menutup sentuhan, jadi layar di belakangnya tetap bisa dipakai (data tersimpan tetap tampil).
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const network = useNetworkState();
  const offline = network.isConnected === false || network.isInternetReachable === false;
  const [wasOffline, setWasOffline] = useState(false);
  const [restored, setRestored] = useState(false);

  // Pindah keadaan saat status jaringan berubah (disesuaikan saat render, bukan di efek).
  if (offline && !wasOffline) {
    setWasOffline(true);
    setRestored(false);
  } else if (!offline && wasOffline) {
    setWasOffline(false);
    setRestored(true);
  }

  // "Kembali online" hanya sebentar.
  useEffect(() => {
    if (!restored) return;
    const t = setTimeout(() => setRestored(false), RESTORED_MS);
    return () => clearTimeout(t);
  }, [restored]);

  if (!offline && !restored) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      exiting={FadeOutUp.duration(200)}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.wrap, { top: insets.top + 6 }]}>
      <View style={[styles.pill, restored && styles.pillRestored]}>
        <Icon name={restored ? 'check' : 'wifiOff'} size={15} color={restored ? '#5CD39A' : '#F28B6B'} strokeWidth={2.4} />
        <Txt weight="bold" size={12} color="#FFFFFF">
          {restored ? 'Kembali online' : 'Tidak ada koneksi internet'}
        </Txt>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 95 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
  },
  pillRestored: { backgroundColor: colors.primaryDark },
});
