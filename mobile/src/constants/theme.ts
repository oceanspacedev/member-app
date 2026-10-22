/**
 * Token visual Space Club — palet "biru sapphire": latar putih kebiruan, permukaan utama
 * (header, kartu gelap) biru sapphire, aksi & sorotan biru terang.
 * `primary` = sapphire merek, `accent` = biru aksi (teks putih di atasnya),
 * `accentOnDark` = aksen di atas latar sapphire/gelap, `success`/`danger` = makna.
 */
export const colors = {
  ground: '#F4F7FC',
  surface: '#FFFFFF',
  ink: '#0F172A',
  inkSoft: '#334155',
  muted: '#5F6C80',
  subtle: '#6B778C',
  line: '#E2E8F0',
  lineSoft: '#EEF2F7',
  inputBorder: '#CBD5E1',

  primary: '#1E40AF',
  primaryDark: '#172F86',
  primaryMid: '#2B4FC0',
  primaryLine: '#3B5FCB',
  primarySoft: '#E8EEFB',
  onPrimaryMuted: '#BCCBF2',

  accent: '#2563EB',
  accentInk: '#FFFFFF',
  accentText: '#1D4ED8',
  accentSoft: '#EAF0FE',
  accentLine: '#C7D6FB',
  /** Biru muda untuk teks, garis & titik aksen di atas latar sapphire/gelap, agar tetap kontras. */
  accentOnDark: '#9DBCFA',

  /** Bayangan & latar redup (modal), dari warna tinta. */
  shade: 'rgba(15, 23, 42, 0.45)',
  shadow: 'rgba(15, 23, 42, 0.08)',

  success: '#1E7A4C',
  danger: '#B3261E',
  dangerSoft: '#FBE9E7',
} as const;

/** Dua warna kelopak logo (berselang-seling) di atas kotak sapphire. */
export const logoPetals = ['#9DBCFA', '#FFFFFF'] as const;

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
  silver: '#5F6B7D',
  gold: '#8E6B2C',
  platinum: '#1B2A55',
};
