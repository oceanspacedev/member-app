import { ScrollView, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { UserAvatar } from '@/components/media';
import { Banner, Button, Loading, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { countdown, useRotatingQr } from '@/lib/use-rotating-qr';

export default function QrScreen() {
  const { user, loyalty } = useSession();
  const { qr, error, secondsLeft, reload: load } = useRotatingQr('/me/qr');

  if (!user) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.primaryDark }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Txt weight="bold" size={16} color="#FFFFFF" accessibilityRole="header">
          QR Member
        </Txt>

        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' }}>
            <UserAvatar name={user.name} uri={user.avatar_url} size={40} />
            <View>
              <Txt weight="bold" size={15}>
                {user.name}
              </Txt>
              <Txt weight="bold" size={12} color={colors.accentText}>
                {loyalty?.tier_label ?? user.tier} Member
              </Txt>
            </View>
          </View>

          <View style={styles.qrBox} accessible accessibilityRole="image" accessibilityLabel="Kode QR member untuk dipindai kasir">
            {qr ? <QRCode value={qr.payload} size={220} color={colors.ink} backgroundColor="#FFFFFF" ecl="M" /> : error ? null : <Loading />}
          </View>

          <Txt weight="extrabold" size={18} style={{ letterSpacing: 1.5 }}>
            {user.member_code_display}
          </Txt>

          {qr && (
            <View style={styles.timer}>
              <Icon name="refresh" size={16} color={colors.accentText} strokeWidth={2} />
              <Txt weight="bold" size={12} color={colors.accentText}>
                QR diperbarui dalam {countdown(secondsLeft)}
              </Txt>
            </View>
          )}

          {error && (
            <View style={{ alignSelf: 'stretch', gap: 10 }}>
              <Banner tone="error" text={error} />
              <Button title="Coba lagi" variant="outline" onPress={load} />
            </View>
          )}

          <Txt size={13} color={colors.muted} style={{ textAlign: 'center', lineHeight: 20 }}>
            Tunjukkan ke kasir di outlet mana pun dalam grup. Poin masuk otomatis setelah transaksi.
          </Txt>
        </View>

        <View style={styles.howTo}>
          <Txt weight="extrabold" size={15} color="#FFFFFF">
            Cara pakai di kasir
          </Txt>
          {[
            ['Belanja poin', `Kasir memindai QR ini, poin bertambah ${loyalty?.cashback_percent ?? 2}% dari total belanja.`],
            ['Tukar poin', 'Sebutkan jumlah poin yang ingin dipakai, tagihan terpotong Rp10 per poin.'],
            ['Pakai voucher', 'Buka Voucher Saya lalu tunjukkan QR vouchernya. Poin tetap masuk dari sisa yang dibayar.'],
          ].map(([title, text], i) => (
            <View key={title} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={styles.step}>
                <Txt weight="extrabold" size={13} color={colors.accentInk}>
                  {i + 1}
                </Txt>
              </View>
              <Txt size={13} color={colors.onPrimaryMuted} style={{ flex: 1, lineHeight: 20 }}>
                <Txt weight="bold" size={13} color="#FFFFFF">
                  {title}
                </Txt>
                {' — '}
                {text}
              </Txt>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 48, gap: 18 },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 22, alignItems: 'center', gap: 14 },
  qrBox: { width: 244, height: 244, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.accentSoft },
  howTo: { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primaryLine, borderRadius: 20, padding: 16, gap: 12 },
  step: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
