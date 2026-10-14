import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';

import { Icon, type IconName } from './icon';
import { Button, Txt } from './ui';

type Action = { label: string; onPress: () => void };

type StateProps = { style?: StyleProp<ViewStyle>; /** Untuk layar berlatar gelap. */ dark?: boolean };

/** Daftar/halaman kosong: ikon, penjelasan singkat, dan satu langkah berikutnya bila ada. */
export function EmptyState({ icon, title, text, action, style, dark }: StateProps & { icon: IconName; title: string; text?: string; action?: Action }) {
  return (
    <View style={[styles.box, style]}>
      <View style={[styles.badge, dark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
        <Icon name={icon} size={30} color={dark ? colors.accent : colors.accentText} strokeWidth={1.7} />
      </View>
      <Txt weight="extrabold" size={17} color={dark ? '#FFFFFF' : colors.ink} style={{ textAlign: 'center' }} accessibilityRole="header">
        {title}
      </Txt>
      {text ? (
        <Txt size={14} color={dark ? colors.onPrimaryMuted : colors.muted} style={styles.text}>
          {text}
        </Txt>
      ) : null}
      {action ? <Button title={action.label} variant={dark ? 'light' : 'outline'} onPress={action.onPress} style={styles.action} /> : null}
    </View>
  );
}

/** Gagal memuat: jelaskan penyebabnya dan beri tombol "Coba lagi" (bukan hanya banner merah). */
export function ErrorState({ message, onRetry, style, dark }: StateProps & { message: string; onRetry?: () => void }) {
  const offline = /koneksi|terhubung|internet/i.test(message);

  return (
    <EmptyState
      icon={offline ? 'wifiOff' : 'info'}
      title={offline ? 'Tidak ada koneksi' : 'Gagal memuat'}
      text={message}
      action={onRetry ? { label: 'Coba lagi', onPress: onRetry } : undefined}
      style={style}
      dark={dark}
    />
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingVertical: 40 },
  badge: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  text: { textAlign: 'center', lineHeight: 21, maxWidth: 320 },
  action: { alignSelf: 'center', minWidth: 180, marginTop: 10 },
});
