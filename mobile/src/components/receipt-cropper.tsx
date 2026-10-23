import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView, type PanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '@/lib/haptics';

/** Potongan foto dalam pecahan lebar/tinggi foto (0–1), jadi tidak bergantung ukuran layar. */
export type CropRect = { x: number; y: number; width: number; height: number };

export const FULL_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 };

// Ruang di tepi agar titik sudut di pinggir foto tetap mudah digeser.
const PAD = 18;
const HANDLE = 48;
// Potongan terkecil di layar (px), supaya kotak tidak bisa "hilang".
const MIN_PX = 56;
const DIM = 'rgba(5, 7, 15, 0.62)';

/**
 * Potong foto sesuai pilihan member. Mengembalikan URI foto baru (JPEG), atau URI asli bila
 * potongannya praktis seluruh foto (tidak perlu dikompres ulang).
 */
export async function cropPhoto(uri: string, crop: CropRect): Promise<string> {
  if (crop.x <= 0.01 && crop.y <= 0.01 && crop.width >= 0.98 && crop.height >= 0.98) return uri;

  const source = await ImageManipulator.manipulate(uri).renderAsync();
  const originX = Math.round(crop.x * source.width);
  const originY = Math.round(crop.y * source.height);
  const width = Math.max(1, Math.min(source.width - originX, Math.round(crop.width * source.width)));
  const height = Math.max(1, Math.min(source.height - originY, Math.round(crop.height * source.height)));

  const image = await ImageManipulator.manipulate(source).crop({ originX, originY, width, height }).renderAsync();
  const saved = await image.saveAsync({ compress: 0.9, format: SaveFormat.JPEG });
  return saved.uri;
}

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

type Size = { width: number; height: number };
type Corner = 'tl' | 'tr' | 'bl' | 'br';

/**
 * Atur potongan nota seperti aplikasi pemindai: foto tampil utuh, bagian di luar potongan digelapkan,
 * empat sudut bisa digeser, dan kotak potongan bisa dipindah. Perubahan dilaporkan saat jari dilepas.
 */
export function ReceiptCropper({
  uri,
  initial,
  onChange,
  style,
}: {
  uri: string;
  initial: CropRect;
  onChange: (crop: CropRect) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [area, setArea] = useState<Size | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);

  const left = useSharedValue(initial.x);
  const top = useSharedValue(initial.y);
  const right = useSharedValue(initial.x + initial.width);
  const bottom = useSharedValue(initial.y + initial.height);

  // Ukuran foto di layar: utuh (contain) di dalam area, dikurangi ruang tepi.
  const scale = area && natural ? Math.min((area.width - PAD * 2) / natural.width, (area.height - PAD * 2) / natural.height) : 0;
  const w = natural ? natural.width * scale : 0;
  const h = natural ? natural.height * scale : 0;
  const minX = w > 0 ? Math.min(1, MIN_PX / w) : 1;
  const minY = h > 0 ? Math.min(1, MIN_PX / h) : 1;

  const report = (l: number, t: number, r: number, b: number) => onChange({ x: l, y: t, width: r - l, height: b - t });
  const grab = () => haptics.select();

  const corner = (c: Corner) =>
    Gesture.Pan()
      // Titik sudut khusus untuk digeser: langsung ikut jari tanpa ambang.
      .minDistance(0)
      .onBegin(() => scheduleOnRN(grab))
      .onChange((e) => {
        if (c === 'tl' || c === 'bl') left.set(clamp(left.get() + e.changeX / w, 0, right.get() - minX));
        else right.set(clamp(right.get() + e.changeX / w, left.get() + minX, 1));
        if (c === 'tl' || c === 'tr') top.set(clamp(top.get() + e.changeY / h, 0, bottom.get() - minY));
        else bottom.set(clamp(bottom.get() + e.changeY / h, top.get() + minY, 1));
      })
      .onFinalize(() => scheduleOnRN(report, left.get(), top.get(), right.get(), bottom.get()));

  const move = Gesture.Pan()
    .minDistance(4)
    .onChange((e) => {
      const dx = clamp(e.changeX / w, -left.get(), 1 - right.get());
      const dy = clamp(e.changeY / h, -top.get(), 1 - bottom.get());
      left.set(left.get() + dx);
      right.set(right.get() + dx);
      top.set(top.get() + dy);
      bottom.set(bottom.get() + dy);
    })
    .onFinalize(() => scheduleOnRN(report, left.get(), top.get(), right.get(), bottom.get()));

  const dimTop = useAnimatedStyle(() => ({ height: top.get() * h }));
  const dimBottom = useAnimatedStyle(() => ({ top: bottom.get() * h, height: (1 - bottom.get()) * h }));
  const dimLeft = useAnimatedStyle(() => ({ top: top.get() * h, height: (bottom.get() - top.get()) * h, width: left.get() * w }));
  const dimRight = useAnimatedStyle(() => ({
    top: top.get() * h,
    height: (bottom.get() - top.get()) * h,
    left: right.get() * w,
    width: (1 - right.get()) * w,
  }));
  const frame = useAnimatedStyle(() => ({
    left: left.get() * w,
    top: top.get() * h,
    width: (right.get() - left.get()) * w,
    height: (bottom.get() - top.get()) * h,
  }));

  return (
    <GestureHandlerRootView
      style={[{ flex: 1 }, style]}
      onLayout={(e) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      accessibilityLabel="Foto struk. Geser sudut bingkai untuk memotong.">
      <Image
        source={{ uri }}
        style={[StyleSheet.absoluteFill, { margin: PAD }]}
        contentFit="contain"
        onLoad={(e) => setNatural({ width: e.source.width, height: e.source.height })}
      />

      {area && w > 0 && h > 0 && (
        <View style={{ position: 'absolute', left: (area.width - w) / 2, top: (area.height - h) / 2, width: w, height: h }}>
          <Animated.View pointerEvents="none" style={[styles.dim, { left: 0, right: 0, top: 0 }, dimTop]} />
          <Animated.View pointerEvents="none" style={[styles.dim, { left: 0, right: 0 }, dimBottom]} />
          <Animated.View pointerEvents="none" style={[styles.dim, { left: 0 }, dimLeft]} />
          <Animated.View pointerEvents="none" style={[styles.dim, dimRight]} />

          <GestureDetector gesture={move}>
            <Animated.View style={[styles.frame, frame]}>
              {/* Garis bantu sepertiga, seperti kamera */}
              <View pointerEvents="none" style={[styles.gridV, { left: '33.33%' }]} />
              <View pointerEvents="none" style={[styles.gridV, { left: '66.66%' }]} />
              <View pointerEvents="none" style={[styles.gridH, { top: '33.33%' }]} />
              <View pointerEvents="none" style={[styles.gridH, { top: '66.66%' }]} />
            </Animated.View>
          </GestureDetector>

          <Handle corner="tl" x={left} y={top} w={w} h={h} gesture={corner('tl')} />
          <Handle corner="tr" x={right} y={top} w={w} h={h} gesture={corner('tr')} />
          <Handle corner="bl" x={left} y={bottom} w={w} h={h} gesture={corner('bl')} />
          <Handle corner="br" x={right} y={bottom} w={w} h={h} gesture={corner('br')} />
        </View>
      )}
    </GestureHandlerRootView>
  );
}

/** Titik sudut: area sentuh besar, tampil sebagai siku putih yang menempel di sudut potongan. */
function Handle({
  corner,
  x,
  y,
  w,
  h,
  gesture,
}: {
  corner: Corner;
  x: SharedValue<number>;
  y: SharedValue<number>;
  w: number;
  h: number;
  gesture: PanGesture;
}) {
  const position = useAnimatedStyle(() => ({ left: x.get() * w - HANDLE / 2, top: y.get() * h - HANDLE / 2 }));
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.handle, position]} hitSlop={8}>
        <View style={[styles.bracket, styles[corner]]} />
      </Animated.View>
    </GestureDetector>
  );
}

const ARM = 24;
const EDGE = HANDLE / 2 - 2;
const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  frame: { position: 'absolute', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.9)' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255, 255, 255, 0.35)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.35)' },
  handle: { position: 'absolute', width: HANDLE, height: HANDLE },
  bracket: { position: 'absolute', width: ARM, height: ARM, borderColor: '#FFFFFF' },
  tl: { left: EDGE, top: EDGE, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 6 },
  tr: { right: EDGE, top: EDGE, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 6 },
  bl: { left: EDGE, bottom: EDGE, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 6 },
  br: { right: EDGE, bottom: EDGE, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 6 },
});
