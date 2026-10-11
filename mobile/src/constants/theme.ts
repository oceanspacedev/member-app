/**
 * Token visual Ocean Space — palet monokrom & emas: tampilan netral agar warna tiap brand
 * yang menonjol di kartu promo. `primary` = hitam merek, `accent` = emas, `success`/`danger` = makna.
 */
export const colors = {
  ground: '#F7F7F5',
  surface: '#FFFFFF',
  ink: '#18181B',
  inkSoft: '#3F3F46',
  muted: '#67676F',
  subtle: '#77777F',
  line: '#E7E5E4',
  lineSoft: '#F1F0EE',
  inputBorder: '#D6D3D1',

  primary: '#18181B',
  primaryDark: '#0E0E10',
  primaryMid: '#232327',
  primaryLine: '#3A3A40',
  primarySoft: '#EEEDEA',
  onPrimaryMuted: '#A9A9B1',

  accent: '#C8A464',
  accentInk: '#2E2412',
  accentText: '#7A5F2A',
  accentSoft: '#F4EEDF',
  accentLine: '#E4D6B8',

  success: '#1E7A4C',
  danger: '#B3261E',
  dangerSoft: '#FBE9E7',
} as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export type FontWeight = keyof typeof fonts;

export const categories = [
  { key: 'culinary', label: 'Kuliner & Resto', short: 'Kuliner' },
  { key: 'fastfood', label: 'Fast Food & Snacks', short: 'Fast Food' },
  { key: 'retail', label: 'Retail & Perhiasan', short: 'Retail & Emas' },
  { key: 'sports', label: 'Sports & Lifestyle', short: 'Sports' },
] as const;

export type CategoryKey = (typeof categories)[number]['key'];

/** Warna kartu tier — cukup gelap agar teks putih tetap terbaca (kontras ≥ 4.5:1). */
export const tierColors: Record<string, string> = {
  silver: '#6F747D',
  gold: '#8E6B2C',
  platinum: '#3E424C',
};
