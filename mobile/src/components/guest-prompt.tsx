import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

import { Icon, type IconName } from './icon';
import { Button, Txt } from './ui';

/** Ajakan masuk untuk tamu, di tempat fitur yang butuh akun member (foto struk, poin, voucher, profil). */
export function GuestPrompt({ icon, title, text, dark }: { icon: IconName; title: string; text: string; dark?: boolean }) {
  return (
    <View style={styles.box}>
      <View style={[styles.icon, dark && { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
        <Icon name={icon} size={30} color={dark ? colors.accentOnDark : colors.primary} strokeWidth={1.8} />
      </View>
      <Txt weight="extrabold" size={18} color={dark ? '#FFFFFF' : colors.ink} style={{ textAlign: 'center' }} accessibilityRole="header">
        {title}
      </Txt>
      <Txt size={14} color={dark ? colors.onPrimaryMuted : colors.muted} style={styles.text}>
        {text}
      </Txt>
      {/* Di atas latar sapphire tombol putih agar menonjol; di latar terang tombol biru. */}
      <Button title="Masuk / Daftar" variant={dark ? 'light' : 'brass'} icon="login" onPress={() => router.push('/login')} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 32 },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  text: { textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  button: { alignSelf: 'stretch', marginTop: 8 },
});
