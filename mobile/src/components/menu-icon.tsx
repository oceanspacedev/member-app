import { Platform } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/constants/theme';

/*
 * Ikon menu Beranda bergaya khas Space Club: duotone biru + garis navy,
 * dengan kelopak logo (lihat logo.tsx) yang muncul di tiap ikon.
 */

// Satu kelopak logo (kotak 18.5) — tiga sudut membulat, satu sudut tajam.
const PETAL = 'M18.5 18.5H9.25A9.25 9.25 0 0 1 0 9.25A9.25 9.25 0 0 1 9.25 0A9.25 9.25 0 0 1 18.5 9.25Z';
const INK = colors.primaryDark;
const BLUE = '#7EA7F5';
const PALE = colors.accentLine;
const CREAM = colors.accentSoft;

/** Empat kelopak logo (kotak 40), dipakai sebagai ukiran/motif. */
function Petals({ transform, fills }: { transform: string; fills: [string, string] }) {
  return (
    <G transform={transform}>
      {[0, 90, 180, 270].map((deg, i) => (
        <Path key={deg} d={PETAL} fill={fills[i % 2]} transform={`rotate(${deg} 20 20)`} />
      ))}
    </G>
  );
}

const icons = {
  vouchers: (
    <>
      <Path d="M8 13H40A3 3 0 0 1 43 16V20A4 4 0 0 0 43 28V32A3 3 0 0 1 40 35H8A3 3 0 0 1 5 32V28A4 4 0 0 0 5 20V16A3 3 0 0 1 8 13Z" fill={BLUE} />
      <Path d="M31 17V31" strokeDasharray="2 3.2" />
      <Path d={PETAL} transform="translate(12.5 19.4) scale(0.5)" fill={INK} stroke="none" />
    </>
  ),
  buy: (
    <>
      <Path d="M18 20V15A6 6 0 0 1 30 15V20" />
      <Path d="M11 18H37L35 39A3 3 0 0 1 32 42H16A3 3 0 0 1 13 39Z" fill={BLUE} />
      <Path d={PETAL} transform="translate(19.4 25) scale(0.5)" fill={CREAM} strokeWidth={4.4} />
    </>
  ),
  points: (
    <>
      <Circle cx={30} cy={17} r={10} fill={PALE} />
      <Circle cx={19} cy={29} r={11.5} fill={BLUE} />
      <G stroke="none">
        <Petals transform="translate(13.4 23.4) scale(0.28)" fills={[INK, INK]} />
      </G>
    </>
  ),
  promo: (
    <>
      <Path d={PETAL} transform="translate(6 6) scale(1.95)" fill={BLUE} strokeWidth={1.13} />
      <Circle cx={17} cy={17} r={3} />
      <Circle cx={28} cy={28} r={3} />
      <Path d="M29.5 14.5 15.5 30.5" />
    </>
  ),
  outlet: (
    <>
      <Path d="M10 20V38A2 2 0 0 0 12 40H36A2 2 0 0 0 38 38V20" fill={PALE} />
      <Path d="M7 16 10 8H38L41 16A4.25 4.25 0 0 1 32.5 16A4.25 4.25 0 0 1 24 16A4.25 4.25 0 0 1 15.5 16A4.25 4.25 0 0 1 7 16Z" fill={BLUE} />
      <Path d="M20 40V30A4 4 0 0 1 28 30V40" fill={BLUE} />
    </>
  ),
  // Empat kelopak = empat lini bisnis grup, sama seperti makna logonya.
  brands: (
    <G strokeWidth={2.3}>
      <Petals transform="translate(5 5) scale(0.95)" fills={[BLUE, PALE]} />
    </G>
  ),
  history: (
    <>
      <Path d="M11 6H35V41L31 38.5 27 41 23 38.5 19 41 15 38.5 11 41Z" fill={PALE} />
      <Path d="M16 14H30M16 20H30M16 26H23" />
      <Circle cx={33} cy={33} r={7.5} fill={BLUE} />
      <Path d="M33 29.5V36.5M29.5 33H36.5" />
    </>
  ),
  level: (
    <>
      <Path d="M7 17 15.5 25 24 11 32.5 25 41 17 37.5 35H10.5Z" fill={BLUE} />
      <Rect x={10.5} y={35} width={27} height={5} rx={1.5} fill={PALE} />
      <Path d={PETAL} transform="translate(20.3 23.5) scale(0.4)" fill={INK} stroke="none" />
    </>
  ),
} as const;

export type MenuIconName = keyof typeof icons;

// Dekoratif: labelnya ada di teks menu.
const hidden: object =
  Platform.OS === 'web'
    ? { 'aria-hidden': true }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' };

export function MenuIcon({ name, size = 48 }: { name: MenuIconName; size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke={INK}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...hidden}>
      {icons[name]}
    </Svg>
  );
}
