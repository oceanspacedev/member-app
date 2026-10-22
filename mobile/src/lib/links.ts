import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { colors } from '@/constants/theme';

import { BASE_URL } from './api';

// Halaman hukum disajikan backend (satu sumber untuk aplikasi dan formulir App Store / Play Store).
const WEB_ORIGIN = BASE_URL.replace(/\/api\/v\d+$/, '');

export const legalUrls = {
  terms: `${WEB_ORIGIN}/syarat-ketentuan`,
  privacy: `${WEB_ORIGIN}/kebijakan-privasi`,
} as const;

// Nomor WhatsApp layanan pelanggan (format internasional tanpa +, mis. 6281234567890). Kosong = menu Bantuan disembunyikan.
const SUPPORT_WHATSAPP = (process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP ?? '').replace(/\D/g, '');

export const hasSupport = SUPPORT_WHATSAPP.length > 0;

/** Buka halaman web di dalam aplikasi (tab browser bawaan), tanpa mengeluarkan pengguna dari aplikasi. */
export function openWebPage(url: string) {
  return WebBrowser.openBrowserAsync(url, { toolbarColor: colors.primary, controlsColor: colors.accent }).catch(() => Linking.openURL(url));
}

/** Buka percakapan WhatsApp dengan layanan pelanggan, dengan pesan pembuka yang sudah terisi. */
export function openSupport(message = 'Halo Space Club, saya butuh bantuan dengan aplikasi member.') {
  return Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`);
}
