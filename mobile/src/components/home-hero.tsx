import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
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
/** Tinggi banner di bawah navbar; kartu ringkasan menumpang 28px di tepi bawahnya. */
export const HERO_HEIGHT = 216;

/**
 * Navbar putih di puncak Beranda: diletakkan di luar ScrollView sehingga tetap terlihat saat digulir.
 * Kolom cari + tombol kartu member; tidak menumpang di atas foto agar warnanya tidak bertabrakan.
 */
export function HomeNavbar({ onSearch, onMemberCard }: { onSearch: () => void; onMemberCard: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.navbar, { paddingTop: insets.top + 8 }]}>
      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Cari outlet, brand, atau kota"
        onPress={onSearch}
        style={({ pressed }) => [styles.search, pressed && { opacity: 0.8 }]}>
        <Icon name="search" size={20} color={colors.muted} strokeWidth={2} />
        <Txt size={14} color={colors.subtle} numberOfLines={1} style={{ flex: 1 }}>
          Cari outlet, brand, atau kota
        </Txt>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tampilkan kartu member"
        onPress={onMemberCard}
        style={({ pressed }) => [styles.square, pressed && { opacity: 0.8 }]}>
        <Icon name="qr" size={22} color={colors.primary} strokeWidth={1.9} />
      </Pressable>
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
 * Banner promo selebar layar tepat di bawah navbar: bergeser sendiri (foto promo, atau gradasi biru
 * bila promo tanpa foto).
 */
export function HomeHero({ promos }: { promos: Promo[] }) {
  const { width } = useWindowDimensions();
  const height = HERO_HEIGHT;
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
          <HeroSlide key={s.key} promo={s.promo} width={width} height={height} />
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

function HeroSlide({ promo, width, height }: { promo?: Promo; width: number; height: number }) {
  // Ruang bawah dikosongkan untuk titik penanda & kartu ringkasan yang menumpang.
  const content = { paddingTop: 20, paddingBottom: 52 };

  if (!promo) {
    return (
      <View style={[styles.slide, content, { width, height }]}>
        <View style={styles.watermark} pointerEvents="none">
          <LogoGlyph size={220} />
        </View>
        <View style={styles.copy}>
          <Txt weight="bold" size={12} color={colors.accentOnDark} style={{ letterSpacing: 2 }}>
            OCEAN SPACE MEMBER CLUB
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
  const openPromo = () => router.navigate({ pathname: '/promo', params: { jenis: '' } });

  // Teks besar dikosongkan admin = desain gambar sudah berisi teks: tampilkan gambarnya saja, tanpa
  // bayangan dan tanpa teks tambahan.
  if (promo.image_url && !promo.highlight) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}. Buka promo.`} onPress={openPromo} style={{ width, height }}>
        <Photo uri={promo.image_url} label={promo.title} tint="transparent" style={StyleSheet.absoluteFill} />
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
          <Photo uri={promo.image_url} label={promo.title} tint="transparent" style={StyleSheet.absoluteFill} />
          <PhotoShade />
        </>
      ) : (
        <View style={styles.watermark} pointerEvents="none">
          <LogoGlyph size={220} />
        </View>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
    zIndex: 2,
  },
  search: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.ground,
    borderWidth: 1,
    borderColor: colors.line,
  },
  square: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { position: 'absolute', bottom: 40, left: 20, flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { width: 18, backgroundColor: '#FFFFFF' },
});
