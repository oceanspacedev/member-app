import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';
import type { Promo } from '@/lib/types';

import { Icon } from './icon';
import { LogoGlyph } from './logo';
import { Photo } from './media';
import { Txt } from './ui';

const INTERVAL_MS = 5000;
const RESUME_AFTER_MS = 7000;
/** Tinggi bagian desain banner (di bawah navbar); kartu ringkasan menumpang 28px di tepi bawahnya. */
export const HERO_HEIGHT = 216;
/** Tinggi isi navbar tanpa status bar: 8 + kolom cari 44 + 10. */
export const NAVBAR_HEIGHT = 62;
/** Jarak gulir sampai navbar berubah penuh menjadi putih. */
export const NAV_SOLID_AT = 90;

/**
 * Navbar Beranda yang menumpang di atas banner (gaya J&T): transparan dengan kolom cari "kaca" saat di
 * puncak, lalu memudar menjadi putih solid saat digulir. Hanya opacity yang dianimasikan (native driver).
 */
export function HomeNavbar({ onSearch, onMemberCard, scrollY }: { onSearch: () => void; onMemberCard: () => void; scrollY: Animated.Value }) {
  const insets = useSafeAreaInsets();
  const solid = scrollY.interpolate({ inputRange: [0, NAV_SOLID_AT], outputRange: [0, 1], extrapolate: 'clamp' });
  const clear = scrollY.interpolate({ inputRange: [0, NAV_SOLID_AT], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={[styles.navbar, { paddingTop: insets.top + 8 }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.navbarSolid, { opacity: solid }]} />

      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Cari outlet, brand, atau kota"
        onPress={onSearch}
        style={({ pressed }) => [styles.search, pressed && { opacity: 0.85 }]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glass, { opacity: clear }]} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.searchSolid, { opacity: solid }]} />
        <Animated.View pointerEvents="none" style={[styles.searchRow, { opacity: clear }]}>
          <Icon name="search" size={20} color="#FFFFFF" strokeWidth={2} />
          <Txt size={14} color="rgba(255,255,255,0.92)" numberOfLines={1} style={{ flex: 1 }}>
            Cari outlet, brand, atau kota
          </Txt>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.searchRow, { opacity: solid }]}>
          <Icon name="search" size={20} color={colors.muted} strokeWidth={2} />
          <Txt size={14} color={colors.subtle} numberOfLines={1} style={{ flex: 1 }}>
            Cari outlet, brand, atau kota
          </Txt>
        </Animated.View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tampilkan kartu member"
        onPress={onMemberCard}
        style={({ pressed }) => [styles.square, pressed && { opacity: 0.85 }]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glass, { opacity: clear }]} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.squareSolid, { opacity: solid }]} />
        <Animated.View pointerEvents="none" style={[styles.center, { opacity: clear }]}>
          <Icon name="qr" size={22} color="#FFFFFF" strokeWidth={1.9} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.center, { opacity: solid }]}>
          <Icon name="qr" size={22} color={colors.primary} strokeWidth={1.9} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

/** Bayangan gelap tipis di bawah status bar & navbar transparan agar teks putihnya selalu terbaca. */
function TopShade({ height }: { height: number }) {
  const id = `top${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height }} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity={0.38} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="1" height="1" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** Gradasi biru merek: sapphire tua di kiri-atas ke biru terang di kanan-bawah. */
export function BlueGradient({ style }: { style?: object }) {
  const id = `blue${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.primaryDark} />
            <Stop offset="0.55" stopColor={colors.primary} />
            <Stop offset="1" stopColor={colors.accent} />
          </LinearGradient>
        </Defs>
        <Rect width="1" height="1" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/**
 * Bayangan netral tipis di bagian bawah foto agar judul promo (teks putih) terbaca. Hitam transparan,
 * bukan biru, sehingga warna foto tetap asli; bagian atas foto bersih tanpa lapisan.
 */
function PhotoShade() {
  const id = `shade${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity={0} />
            <Stop offset="0.45" stopColor="#000000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.5} />
          </LinearGradient>
        </Defs>
        <Rect width="1" height="1" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

type Slide = { key: string; promo?: Promo };

/**
 * Banner promo penuh sampai ke belakang status bar & navbar (`topInset`), bergeser sendiri. Desain 16:9
 * mengisi seluruh area (cover), jadi sisi kiri-kanannya sedikit terpotong — teks penting desain sebaiknya
 * di bagian tengah.
 */
export function HomeHero({ promos, topInset = 0 }: { promos: Promo[]; topInset?: number }) {
  const { width } = useWindowDimensions();
  const height = topInset + HERO_HEIGHT;
  const reduceMotion = useReducedMotion();

  // Tanpa promo: satu slide sambutan merek.
  const slides: Slide[] = promos.length > 0 ? promos.slice(0, 5).map((p) => ({ key: `p${p.id}`, promo: p })) : [{ key: 'welcome' }];

  const scroller = useRef<ScrollView>(null);
  const indexRef = useRef(0);
  const pausedUntil = useRef(0);
  const [index, setIndex] = useState(0);
  const [focused, setFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    if (!focused || reduceMotion || slides.length < 2) return;
    const timer = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      const next = (indexRef.current + 1) % slides.length;
      indexRef.current = next;
      setIndex(next);
      scroller.current?.scrollTo({ x: next * width, animated: true });
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [focused, reduceMotion, slides.length, width]);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== indexRef.current && i >= 0 && i < slides.length) {
      indexRef.current = i;
      setIndex(i);
    }
  }

  const pause = () => {
    pausedUntil.current = Date.now() + RESUME_AFTER_MS;
  };

  return (
    <View style={{ height }}>
      <BlueGradient />

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onScrollBeginDrag={pause}
        onTouchStart={pause}>
        {slides.map((s) => (
          <HeroSlide key={s.key} promo={s.promo} width={width} height={height} topInset={topInset} />
        ))}
      </ScrollView>

      {slides.length > 1 && (
        <View style={styles.dots} aria-hidden>
          {slides.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

function HeroSlide({ promo, width, height, topInset }: { promo?: Promo; width: number; height: number; topInset: number }) {
  // Atas: ruang navbar. Bawah: ruang titik penanda & kartu ringkasan yang menumpang.
  const content = { paddingTop: topInset + 20, paddingBottom: 52 };

  if (!promo) {
    return (
      <View style={[styles.slide, content, { width, height }]}>
        <View style={styles.watermark} pointerEvents="none">
          <LogoGlyph size={220} />
        </View>
        {topInset > 0 && <TopShade height={topInset + 24} />}
        <View style={styles.copy}>
          <Txt weight="bold" size={12} color={colors.accentOnDark} style={{ letterSpacing: 2 }}>
            SPACE CLUB
          </Txt>
          <Txt weight="extrabold" size={26} color="#FFFFFF" style={{ letterSpacing: -0.5, lineHeight: 32 }}>
            Satu kartu,{'\n'}semua brand grup
          </Txt>
          <Txt size={13} color={colors.onPrimaryMuted}>
            Kumpulkan poin di setiap belanja.
          </Txt>
        </View>
      </View>
    );
  }

  const where = promo.is_universal ? 'Semua outlet' : (promo.brand?.name ?? '');
  const label = promo.highlight ? `${promo.highlight} ${promo.highlight_caption ?? ''}, ${promo.title}` : promo.title;
  const openPromo = () => router.push({ pathname: '/promos/[id]', params: { id: String(promo.id) } });

  // Teks besar dikosongkan admin = desain gambar sudah berisi teks: tampilkan gambarnya saja, tanpa
  // bayangan dan tanpa teks tambahan.
  if (promo.image_url && !promo.highlight) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}. Buka promo.`} onPress={openPromo} style={{ width, height }}>
        <Photo uri={promo.image_url} label={promo.title} tint={colors.primaryDark} style={StyleSheet.absoluteFill} />
        {topInset > 0 && <TopShade height={topInset + 24} />}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. Buka promo.`}
      onPress={openPromo}
      style={[styles.slide, content, { width, height }]}>
      {promo.image_url ? (
        <>
          <Photo uri={promo.image_url} label={promo.title} tint={colors.primaryDark} style={StyleSheet.absoluteFill} />
          <PhotoShade />
        </>
      ) : (
        <View style={styles.watermark} pointerEvents="none">
          <LogoGlyph size={220} />
        </View>
      )}
      {topInset > 0 && <TopShade height={topInset + 24} />}
      <View style={styles.copy}>
        <Txt weight="semibold" size={12} color="rgba(255,255,255,0.92)" numberOfLines={1} style={styles.textShadow}>
          {where}
        </Txt>
        {promo.highlight ? (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Txt weight="extrabold" size={30} color="#FFFFFF" style={[{ letterSpacing: -0.6 }, styles.textShadow]} numberOfLines={1}>
              {promo.highlight}
            </Txt>
            {promo.highlight_caption && (
              <Txt weight="semibold" size={14} color="#FFFFFF" numberOfLines={1} style={[{ flexShrink: 1 }, styles.textShadow]}>
                {promo.highlight_caption}
              </Txt>
            )}
          </View>
        ) : null}
        <Txt weight="semibold" size={14} color="#FFFFFF" numberOfLines={2} style={[{ maxWidth: 300, lineHeight: 20 }, styles.textShadow]}>
          {promo.title}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slide: { justifyContent: 'flex-end', paddingHorizontal: 20, overflow: 'hidden' },
  copy: { gap: 4 },
  // Bayangan halus pada teks putih: tetap terbaca di bagian foto yang terang tanpa lapisan warna tebal.
  textShadow: { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  watermark: { position: 'absolute', right: -50, bottom: -40, opacity: 0.12 },
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  navbarSolid: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  // Kolom & tombol "kaca" di atas banner.
  glass: { backgroundColor: 'rgba(15, 23, 42, 0.32)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 12 },
  search: { flex: 1, height: 44, borderRadius: 12, overflow: 'hidden' },
  searchSolid: { backgroundColor: colors.ground, borderWidth: 1, borderColor: colors.line, borderRadius: 12 },
  searchRow: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  square: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden' },
  squareSolid: { backgroundColor: colors.primarySoft, borderRadius: 12 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', bottom: 40, left: 20, flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { width: 18, backgroundColor: '#FFFFFF' },
});
