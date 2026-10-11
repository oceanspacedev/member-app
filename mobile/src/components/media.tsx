import { Image } from 'expo-image';
import { useId } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';
import { initials } from '@/lib/format';

import { Txt } from './ui';

/** Foto dengan cache disk + transisi halus; latar `tint` tampil selama memuat. */
export function Photo({ uri, label, tint, style }: { uri: string; label: string; tint?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: tint ?? colors.lineSoft, overflow: 'hidden' }, style]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        // Di web, fade-in expo-image bisa tertahan di opacity 0; transisi hanya di native.
        transition={Platform.OS === 'web' ? null : 250}
        cachePolicy="memory-disk"
        accessibilityLabel={label}
        alt={label}
      />
    </View>
  );
}

/** Gradasi gelap transparan agar teks putih di atas foto tetap terbaca. */
export function Scrim({ from = 0, to = 0.7, style }: { from?: number; to?: number; style?: StyleProp<ViewStyle> }) {
  const id = `scrim${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity={from} />
            <Stop offset="1" stopColor="#000000" stopOpacity={to} />
          </LinearGradient>
        </Defs>
        <Rect width="1" height="1" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** Foto profil member; jika belum ada, inisial di lingkaran emas. */
export function UserAvatar({ name, uri, size = 44 }: { name: string | null; uri?: string | null; size?: number }) {
  if (uri) {
    return <Photo uri={uri} label={`Foto profil ${name ?? ''}`.trim()} tint={colors.accent} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Txt weight="extrabold" size={Math.round(size * 0.34)} color={colors.primaryDark}>
        {initials(name)}
      </Txt>
    </View>
  );
}

/** Logo resmi brand bila sudah diunggah; jika belum, tidak menampilkan apa pun. */
export function BrandAvatar({
  name,
  logoUrl,
  size = 44,
  radius = 12,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
  radius?: number;
}) {
  if (!logoUrl) return null;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.line,
        overflow: 'hidden',
        padding: Math.round(size * 0.08),
      }}>
      <Image source={{ uri: logoUrl }} style={{ flex: 1 }} contentFit="contain" cachePolicy="memory-disk" accessibilityLabel={`Logo ${name}`} alt={`Logo ${name}`} />
    </View>
  );
}
