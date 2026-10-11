import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { colors } from '@/constants/theme';
import { shortDate } from '@/lib/format';
import type { Promo } from '@/lib/types';

import { Photo, Scrim } from './media';
import { Txt } from './ui';

const INTERVAL_MS = 4000;
const RESUME_AFTER_MS = 6000;
const GAP = 12;
const SIDE = 16;

/** Karusel promo yang bergeser sendiri; berhenti saat disentuh atau saat layar tidak aktif. */
export function PromoCarousel({ promos }: { promos: Promo[] }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width, 560) - SIDE * 2;
  const step = cardWidth + GAP;

  const scroller = useRef<ScrollView>(null);
  const indexRef = useRef(0);
  const pausedUntil = useRef(0);
  const [index, setIndex] = useState(0);
  const [focused, setFocused] = useState(true);
  const reduceMotion = useReducedMotion();

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    if (!focused || reduceMotion || promos.length < 2) return;
    const timer = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      const next = (indexRef.current + 1) % promos.length;
      indexRef.current = next;
      setIndex(next);
      scroller.current?.scrollTo({ x: next * step, animated: true });
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [focused, reduceMotion, promos.length, step]);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / step);
    if (i !== indexRef.current && i >= 0 && i < promos.length) {
      indexRef.current = i;
      setIndex(i);
    }
  }

  const pause = () => {
    pausedUntil.current = Date.now() + RESUME_AFTER_MS;
  };

  if (promos.length === 0) return null;

  return (
    <View style={{ gap: 12 }}>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={32}
        onScrollBeginDrag={pause}
        onTouchStart={pause}
        contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP }}>
        {promos.map((p) => (
          <PromoSlide key={p.id} promo={p} width={cardWidth} />
        ))}
      </ScrollView>

      {promos.length > 1 && (
        <View style={styles.dots} aria-hidden>
          {promos.map((p, i) => (
            <View key={p.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

function PromoSlide({ promo, width }: { promo: Promo; width: number }) {
  const brand = promo.is_universal ? 'Semua outlet' : (promo.brand?.name ?? '');

  return (
    <Pressable accessibilityRole="button" onPress={() => router.navigate('/promo')} style={[styles.slide, { width }]}>
      <View style={[styles.photo, { backgroundColor: promo.brand?.color ?? colors.primary }]}>
        {promo.image_url && <Photo uri={promo.image_url} label={promo.title} style={StyleSheet.absoluteFill} />}
        <Scrim from={0} to={0.55} />
        <View style={styles.photoText}>
          <Txt weight="extrabold" size={26} color="#FFFFFF" style={{ letterSpacing: -0.5 }}>
            {promo.highlight}
          </Txt>
          {promo.highlight_caption && (
            <Txt weight="semibold" size={13} color="#FFFFFF">
              {promo.highlight_caption}
            </Txt>
          )}
        </View>
      </View>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 3 }}>
        <Txt size={12} color={colors.muted}>
          {brand} · s.d. {shortDate(promo.ends_at)}
        </Txt>
        <Txt weight="bold" size={15} numberOfLines={1}>
          {promo.title}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slide: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  photo: { width: '100%', aspectRatio: 16 / 9, justifyContent: 'flex-end' },
  photoText: { padding: 14, gap: 0 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.inputBorder },
  dotActive: { width: 18, backgroundColor: colors.primary },
});
