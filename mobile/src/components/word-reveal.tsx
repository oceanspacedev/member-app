import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { FontWeight } from '@/constants/theme';
import { colors } from '@/constants/theme';

import { Txt } from './ui';

type Props = {
  text: string;
  size?: number;
  weight?: FontWeight;
  color?: string;
  /** Jeda sebelum kata pertama muncul (ms). */
  delay?: number;
  /** Jarak antar-kata (ms). */
  step?: number;
  header?: boolean;
};

/**
 * Teks yang muncul kata demi kata (fade + naik sedikit) saat layar pertama kali tampil.
 * Reanimated otomatis melewati animasi bila "kurangi gerakan" aktif di perangkat.
 */
export function WordReveal({ text, size = 14, weight = 'regular', color = colors.ink, delay = 0, step = 110, header }: Props) {
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <View
      accessible
      accessibilityRole={header ? 'header' : 'text'}
      accessibilityLabel={text}
      style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {words.map((word, i) => (
        <Animated.View
          key={`${i}-${word}`}
          entering={FadeInDown.delay(delay + i * step).duration(360)}
          // Spasi antar-kata sebagai margin: spasi di akhir Text tidak selalu dihitung lebarnya.
          style={{ marginRight: i < words.length - 1 ? size * 0.28 : 0 }}>
          <Txt weight={weight} size={size} color={color}>
            {word}
          </Txt>
        </Animated.View>
      ))}
    </View>
  );
}
