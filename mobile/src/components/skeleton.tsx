import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { colors } from '@/constants/theme';

/** Kotak abu yang berdenyut pelan sebagai pengganti konten yang sedang dimuat. */
export function Skeleton({ width = '100%', height, radius = 8, style }: { width?: DimensionValue; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const pulse = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [reduceMotion, pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: reduceMotion ? 1 : 1 - 0.5 * pulse.get() }));

  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.line }, animated, style]} />;
}

/** Pembungkus kerangka muat: pembaca layar cukup mendengar satu kata "Memuat". */
export function SkeletonGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Memuat" aria-busy style={style}>
      {children}
    </View>
  );
}

/** Kerangka kartu promo (foto 16:9 + tiga baris teks). */
export function PromoCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton radius={0} style={{ aspectRatio: 16 / 9 }} />
      <View style={{ padding: 14, gap: 9 }}>
        <Skeleton width="38%" height={11} />
        <Skeleton width="86%" height={15} />
        <Skeleton width="30%" height={11} />
      </View>
    </View>
  );
}

/** Kerangka baris outlet (foto kecil + tiga baris teks). */
export function OutletRowSkeleton() {
  return (
    <View style={styles.outlet}>
      <Skeleton width={88} height={66} radius={10} />
      <View style={{ flex: 1, gap: 9 }}>
        <Skeleton width="62%" height={15} />
        <Skeleton width="48%" height={12} />
        <Skeleton width="36%" height={12} />
      </View>
    </View>
  );
}

/** Kerangka kartu voucher bergaya tiket. */
export function VoucherCardSkeleton() {
  return (
    <View style={[styles.card, { flexDirection: 'row' }]}>
      <Skeleton width={96} radius={0} style={{ alignSelf: 'stretch' }} />
      <View style={{ flex: 1, padding: 14, gap: 9 }}>
        <Skeleton width="44%" height={11} />
        <Skeleton width="80%" height={15} />
        <Skeleton width="50%" height={12} />
        <Skeleton width="36%" height={12} />
      </View>
    </View>
  );
}

export function PromoListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonGroup style={{ padding: 16, paddingTop: 4, gap: 14 }}>
      {Array.from({ length: count }, (_, i) => (
        <PromoCardSkeleton key={i} />
      ))}
    </SkeletonGroup>
  );
}

export function OutletListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SkeletonGroup>
      {Array.from({ length: count }, (_, i) => (
        <OutletRowSkeleton key={i} />
      ))}
    </SkeletonGroup>
  );
}

export function VoucherListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonGroup style={{ padding: 16, paddingTop: 4, gap: 12 }}>
      {Array.from({ length: count }, (_, i) => (
        <VoucherCardSkeleton key={i} />
      ))}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  outlet: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
});
