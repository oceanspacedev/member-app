import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors, logoPetals } from '@/constants/theme';

import { Txt } from './ui';

// Sama dengan splash bawaan (app.json: latar colors.primary, logo selebar 110) agar peralihannya mulus.
const LOGO = 110;
const PETAL_D = 'M18.5 18.5H9.25A9.25 9.25 0 0 1 0 9.25A9.25 9.25 0 0 1 9.25 0A9.25 9.25 0 0 1 18.5 9.25Z';
const PETAL = (LOGO * 18.5) / 40;
// Urutan searah jarum jam: kiri-atas, kanan-atas, kanan-bawah, kiri-bawah (sudut tajam menghadap tengah).
const PLACES = [
  { deg: 0, left: 0, top: 0 },
  { deg: 90, left: LOGO - PETAL, top: 0 },
  { deg: 180, left: LOGO - PETAL, top: LOGO - PETAL },
  { deg: 270, left: 0, top: LOGO - PETAL },
];
const MIN_SHOW_MS = 1700;

/**
 * Layar pembuka: logo naik, nama aplikasi muncul, lalu keempat kelopak berdenyut bergantian
 * sebagai animasi memuat. Selesai (memudar) setelah `ready` dan tampil minimal ±1,7 detik.
 */
export function AppIntro({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const lift = useSharedValue(0);
  const text = useSharedValue(0);
  const bar = useSharedValue(0);
  const exit = useSharedValue(0);
  const p0 = useSharedValue(1);
  const p1 = useSharedValue(1);
  const p2 = useSharedValue(1);
  const p3 = useSharedValue(1);
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      lift.set(1);
      text.set(1);
      bar.set(0.85);
    } else {
      lift.set(withDelay(150, withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) })));
      text.set(withDelay(560, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) })));
      bar.set(withDelay(520, withTiming(0.85, { duration: 1300, easing: Easing.out(Easing.quad) })));
      // Kelopak berdenyut bergantian searah jarum jam selama memuat.
      [p0, p1, p2, p3].forEach((p, i) =>
        p.set(withDelay(820 + i * 150, withRepeat(withSequence(withTiming(0.35, { duration: 330 }), withTiming(1, { duration: 330 })), -1))),
      );
    }
    const t = setTimeout(() => setMinElapsed(true), reduceMotion ? 500 : MIN_SHOW_MS);
    return () => clearTimeout(t);
  }, [reduceMotion, lift, text, bar, p0, p1, p2, p3]);

  useEffect(() => {
    if (!ready || !minElapsed) return;
    bar.set(withTiming(1, { duration: 220 }));
    exit.set(withDelay(180, withTiming(1, { duration: 380, easing: Easing.in(Easing.quad) })));
    const t = setTimeout(onDone, 620);
    return () => clearTimeout(t);
  }, [ready, minElapsed, bar, exit, onDone]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.get() }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -46 * lift.get() }, { scale: 1 - 0.18 * lift.get() + 0.08 * exit.get() }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: text.get(),
    transform: [{ translateY: 12 * (1 - text.get()) }],
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.get() * 100}%` }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]} accessible accessibilityLabel="Memuat Space Club">
      <StatusBar style="light" />
      <Animated.View style={[styles.logo, { left: width / 2 - LOGO / 2, top: height / 2 - LOGO / 2 }, logoStyle]}>
        {PLACES.map((place, i) => (
          <Petal key={place.deg} place={place} color={logoPetals[i % 2]} pulse={[p0, p1, p2, p3][i]} />
        ))}
      </Animated.View>

      <Animated.View style={[styles.text, { top: height / 2 + 22 }, textStyle]}>
        <Txt weight="extrabold" size={26} color="#FFFFFF" style={{ letterSpacing: -0.4 }}>
          Space Club
        </Txt>
        <Txt weight="bold" size={11} color={colors.accentOnDark} style={{ letterSpacing: 3.5 }}>
          SATU KARTU · SEMUA BRAND
        </Txt>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, barStyle]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function Petal({ place, color, pulse }: { place: (typeof PLACES)[number]; color: string; pulse: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <Animated.View style={[styles.petal, { left: place.left, top: place.top, transform: [{ rotate: `${place.deg}deg` }] }, style]}>
      <Svg width={PETAL} height={PETAL} viewBox="0 0 18.5 18.5">
        <Path d={PETAL_D} fill={color} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: colors.primary, zIndex: 100 },
  logo: { position: 'absolute', width: LOGO, height: LOGO },
  petal: { position: 'absolute', width: PETAL, height: PETAL },
  text: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 6 },
  track: { width: 120, height: 3, borderRadius: 2, marginTop: 18, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: colors.accentOnDark },
});
