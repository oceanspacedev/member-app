import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colors, tierColors } from '@/constants/theme';

/*
 * Ilustrasi kecil untuk Beranda (kartu aksi & ringkasan level), sekeluarga dengan ikon menu:
 * duotone biru + garis navy, dengan kelopak logo Ocean Space sebagai stempel.
 */

const PETAL = 'M18.5 18.5H9.25A9.25 9.25 0 0 1 0 9.25A9.25 9.25 0 0 1 9.25 0A9.25 9.25 0 0 1 18.5 9.25Z';
const INK = colors.primaryDark;
const BLUE = '#7EA7F5';
const PALE = colors.accentLine;
const CREAM = colors.accentSoft;

// Dekoratif: maknanya sudah ada di teks kartu.
const hidden: object =
  Platform.OS === 'web'
    ? { 'aria-hidden': true }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' };

function Petals({ transform, fills }: { transform: string; fills: [string, string] }) {
  return (
    <G transform={transform}>
      {[0, 90, 180, 270].map((deg, i) => (
        <Path key={deg} d={PETAL} fill={fills[i % 2]} transform={`rotate(${deg} 20 20)`} />
      ))}
    </G>
  );
}

function Art({ size, children }: { size: number; children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...hidden}>
      {children}
    </Svg>
  );
}

/** Struk belanja + kamera: "Foto struk, dapat poin". */
export function ReceiptArt({ size = 56 }: { size?: number }) {
  return (
    <Art size={size}>
      <Circle cx={32} cy={34} r={26} fill={CREAM} stroke="none" />
      <Path d="M14 8H40V50L36.75 47.5 33.5 50 30.25 47.5 27 50 23.75 47.5 20.5 50 17.25 47.5 14 50Z" fill="#FFFFFF" />
      <Path d="M19 16H35M19 22H35M19 28H29" />
      <Path d="M19 38H35" strokeDasharray="2 3" />
      <Rect x={30} y={33} width={26} height={20} rx={5} fill={BLUE} />
      <Path d="M37 33L39.5 29H46.5L49 33" fill={BLUE} />
      <Circle cx={43} cy={43} r={5.5} fill={CREAM} />
      <Path d={PETAL} transform="translate(40.6 40.6) scale(0.26)" fill={INK} stroke="none" />
    </Art>
  );
}

/** Kado + koin: "Tukar poin jadi voucher". */
export function RewardArt({ size = 56 }: { size?: number }) {
  return (
    <Art size={size}>
      <Circle cx={32} cy={34} r={26} fill={CREAM} stroke="none" />
      <Rect x={10} y={30} width={32} height={24} rx={3} fill={BLUE} />
      <Rect x={7} y={22} width={38} height={9} rx={2.5} fill={PALE} />
      <Path d="M26 22V54" />
      <Path d="M26 22C22 14 13 14 15 20C16 22.5 21 22 26 22ZM26 22C30 14 39 14 37 20C36 22.5 31 22 26 22Z" fill="#FFFFFF" />
      <Circle cx={47} cy={18} r={11} fill={PALE} />
      <G stroke="none">
        <Petals transform="translate(41.5 12.5) scale(0.275)" fills={[INK, INK]} />
      </G>
    </Art>
  );
}

/** Medali level (warna sesuai tier) untuk ringkasan poin di Beranda. */
export function TierMedal({ tier, size = 36 }: { tier: string; size?: number }) {
  const color = tierColors[tier] ?? colors.primary;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" {...hidden}>
      <Path d="M13 2H27L24 12H16Z" fill={PALE} />
      <Circle cx={20} cy={24} r={14} fill={color} />
      <Circle cx={20} cy={24} r={10.5} fill="none" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.5} />
      <Path d="M13.5 22 16.5 25 20 19 23.5 25 26.5 22 25 30H15Z" fill="#FFFFFF" />
    </Svg>
  );
}
