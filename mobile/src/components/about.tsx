import Constants from 'expo-constants';
import { Pressable } from 'react-native';

import { colors } from '@/constants/theme';
import { hasSupport, legalUrls, openSupport, openWebPage } from '@/lib/links';
import { resetLocalDataForDev } from '@/lib/session';

import { MenuGroup, type MenuRowItem } from './menu-row';
import { Txt } from './ui';

/** Bantuan, syarat, dan privasi: wajib ada dan mudah ditemukan untuk App Store & Play Store. Dipakai di profil member dan tamu. */
export function AboutGroup() {
  const rows: MenuRowItem[] = [
    ...(hasSupport ? [{ icon: 'help' as const, label: 'Pusat bantuan', value: 'Chat WhatsApp layanan pelanggan', go: () => void openSupport() }] : []),
    { icon: 'file', label: 'Syarat & ketentuan', go: () => void openWebPage(legalUrls.terms) },
    { icon: 'lock', label: 'Kebijakan privasi', go: () => void openWebPage(legalUrls.privacy) },
  ];

  return <MenuGroup title="Bantuan & informasi" rows={rows} />;
}

/** Versi aplikasi (berguna saat melapor masalah). Mode pengembangan: tahan lama untuk mengulang alur pembukaan pertama. */
export function AppVersion() {
  return (
    <Pressable onLongPress={__DEV__ ? () => void resetLocalDataForDev() : undefined} accessibilityRole="text">
      <Txt size={12} color={colors.subtle} style={{ textAlign: 'center' }}>
        Ocean Space · versi {Constants.expoConfig?.version ?? '1.0.0'}
      </Txt>
    </Pressable>
  );
}
