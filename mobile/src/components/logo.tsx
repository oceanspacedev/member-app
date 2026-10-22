import Svg, { G, Path, Rect } from 'react-native-svg';

import { colors, logoPetals } from '@/constants/theme';

// Sumber: assets/brand/logo-mark.svg. Empat kelopak = empat lini bisnis grup yang menyatu.
const PETAL = 'M18.5 18.5H9.25A9.25 9.25 0 0 1 0 9.25A9.25 9.25 0 0 1 9.25 0A9.25 9.25 0 0 1 18.5 9.25Z';

function Petals() {
  return (
    <>
      {[0, 90, 180, 270].map((deg, i) => (
        <Path key={deg} d={PETAL} fill={logoPetals[i % 2]} transform={`rotate(${deg} 20 20)`} />
      ))}
    </>
  );
}

/** Logo aplikasi: kelopak biru muda & putih di kotak sapphire. */
export function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Logo Space Club">
      <Rect width={48} height={48} rx={12} fill={colors.primary} />
      <G transform="translate(10 10) scale(0.7)">
        <Petals />
      </G>
    </Svg>
  );
}

/** Glyph kelopak saja, tanpa latar. */
export function LogoGlyph({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityLabel="Logo Space Club">
      <Petals />
    </Svg>
  );
}
