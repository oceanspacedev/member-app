import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { LogoGlyph } from '@/components/logo';
import { ArtFrame, MemberCardArt, ReceiptArt, VoucherLevelArt } from '@/components/onboarding-art';
import { Button, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useIntroDone } from '@/lib/intro';
import { useSession } from '@/lib/session';

type Slide = { key: string; Art: ComponentType; title: string; text: string };

const SLIDES: Slide[] = [
  {
    key: 'card',
    Art: MemberCardArt,
    title: 'Satu kartu, semua brand Ocean Space',
    text: 'Kuliner, fast food, retail & emas, sampai sports. Poin dari satu brand bisa dipakai di brand lain.',
  },
  {
    key: 'receipt',
    Art: ReceiptArt,
    title: 'Foto struk, poin langsung masuk',
    text: 'Habis belanja di outlet Ocean Space? Foto struknya, kami periksa otomatis dan poin masuk ke akunmu.',
  },
  {
    key: 'voucher',
    Art: VoucherLevelArt,
    title: 'Tukar jadi voucher, naik level',
    text: 'Tukar poin dengan voucher, lalu nikmati cashback lebih besar dari level Silver sampai Platinum.',
  },
];

/**
 * Pengenalan aplikasi, tampil sekali pada pembukaan pertama: tiga layar singkat yang menjelaskan nilai
 * utama (satu kartu, foto struk, voucher & level), lalu mengarah ke login atau mode tamu.
 */
export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const { completeOnboarding, continueAsGuest } = useSession();
  const introDone = useIntroDone();
  const reduceMotion = useReducedMotion();
  const scroller = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const reveal = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  // Ilustrasi mengisi sebagian besar tinggi layar, tapi tetap muat bersama teks di layar kecil.
  const artSize = Math.min(width - 32, Math.max(200, height * (height < 720 ? 0.33 : 0.4)), 360);

  // Isi muncul pelan setelah layar pembuka berlogo selesai, bukan berjalan di baliknya.
  useEffect(() => {
    if (!introDone) return;
    reveal.set(reduceMotion ? 1 : withDelay(80, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) })));
  }, [introDone, reduceMotion, reveal]);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.set(e.contentOffset.x);
  });

  const revealStyle = useAnimatedStyle(() => ({ opacity: reveal.get(), transform: [{ translateY: (1 - reveal.get()) * 22 }] }));

  // Halaman aktif diikuti dari posisi geser (bukan dari "momentum end") agar sama di iOS, Android, dan web,
  // termasuk saat berpindah lewat tombol "Lanjut".
  const onPage = (page: number) => {
    setIndex(page);
    haptics.select();
  };
  useAnimatedReaction(
    () => Math.max(0, Math.min(SLIDES.length - 1, Math.round(scrollX.get() / width))),
    (page, previous) => {
      if (previous !== null && page !== previous) scheduleOnRN(onPage, page);
    },
    [width],
  );

  function next() {
    const page = Math.round(scrollX.get() / width);
    scroller.current?.scrollTo({ x: Math.min(page + 1, SLIDES.length - 1) * width, animated: true });
  }

  // Selesai: lanjut ke login. Navigasi eksplisit agar ada transisi; layar ini lalu keluar dari tumpukan
  // karena guard-nya di root layout menutup begitu pengenalan dianggap selesai.
  function start() {
    haptics.tap();
    router.replace('/login');
    completeOnboarding();
  }

  async function explore() {
    haptics.tap();
    await continueAsGuest();
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <View style={styles.topBar}>
        <View style={styles.brand}>
          <LogoGlyph size={24} />
          <Txt weight="extrabold" size={15} color="#FFFFFF">
            Ocean Space
          </Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lewati pengenalan"
          accessibilityElementsHidden={last}
          importantForAccessibility={last ? 'no-hide-descendants' : 'auto'}
          disabled={last}
          onPress={start}
          hitSlop={8}
          style={({ pressed }) => [styles.skip, { opacity: last ? 0 : pressed ? 0.6 : 1 }]}>
          <Txt weight="semibold" size={14} color={colors.onPrimaryMuted}>
            Lewati
          </Txt>
        </Pressable>
      </View>

      <Animated.View style={[{ flex: 1 }, revealStyle]}>
        <Animated.ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}>
          {SLIDES.map((slide, i) => (
            <SlidePage key={slide.key} slide={slide} index={i} width={width} artSize={artSize} scrollX={scrollX} />
          ))}
        </Animated.ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {SLIDES.map((slide, i) => (
              <Dot key={slide.key} index={i} width={width} scrollX={scrollX} />
            ))}
          </View>

          <Button title={last ? 'Mulai sekarang' : 'Lanjut'} variant="light" onPress={last ? start : next} />

          <Pressable
            accessibilityRole="button"
            accessibilityElementsHidden={!last}
            importantForAccessibility={last ? 'auto' : 'no-hide-descendants'}
            disabled={!last}
            onPress={explore}
            hitSlop={8}
            style={({ pressed }) => [styles.guest, { opacity: last ? (pressed ? 0.6 : 1) : 0 }]}>
            <Txt weight="semibold" size={14} color="#FFFFFF">
              Jelajahi dulu sebagai tamu
            </Txt>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

function SlidePage({ slide, index, width, artSize, scrollX }: { slide: Slide; index: number; width: number; artSize: number; scrollX: SharedValue<number> }) {
  // Ilustrasi bergeser lebih lambat dari teks (paralaks) dan mengecil-memudar saat meninggalkan layar.
  const art = useAnimatedStyle(() => {
    const p = scrollX.get() / width - index;
    const d = Math.min(1, Math.abs(p));
    return { opacity: 1 - d, transform: [{ translateX: p * width * 0.22 }, { scale: 1 - d * 0.12 }] };
  });
  const copy = useAnimatedStyle(() => {
    const d = Math.min(1, Math.abs(scrollX.get() / width - index));
    return { opacity: Math.max(0, 1 - d * 1.5) };
  });

  return (
    <View style={[styles.page, { width }]}>
      <Animated.View style={[{ alignItems: 'center' }, art]}>
        <ArtFrame size={artSize}>
          <slide.Art />
        </ArtFrame>
      </Animated.View>

      <Animated.View style={[styles.copy, copy]} accessible accessibilityLabel={`${slide.title}. ${slide.text}`}>
        <Txt weight="extrabold" size={width < 380 ? 25 : 28} color="#FFFFFF" style={{ letterSpacing: -0.5, lineHeight: width < 380 ? 31 : 35 }} accessibilityRole="header">
          {slide.title}
        </Txt>
        <Txt size={15} color={colors.onPrimaryMuted} style={{ lineHeight: 23 }}>
          {slide.text}
        </Txt>
      </Animated.View>
    </View>
  );
}

function Dot({ index, width, scrollX }: { index: number; width: number; scrollX: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const d = Math.min(1, Math.abs(scrollX.get() / width - index));
    return {
      width: interpolate(d, [0, 1], [24, 7]),
      backgroundColor: interpolateColor(d, [0, 1], [colors.accentOnDark, 'rgba(255, 255, 255, 0.22)']),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  skip: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  page: { paddingHorizontal: 24, justifyContent: 'center', gap: 26 },
  copy: { gap: 12, height: 150 },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { height: 7, borderRadius: 4 },
  guest: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
