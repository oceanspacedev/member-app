import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';

import { Icon } from './icon';
import { TierMedal } from './home-art';
import { Button, Txt } from './ui';

type MemberQr = { payload: string; expires_at: number };

/**
 * Kartu member untuk ditunjukkan ke kasir: QR bertanda tangan dari server (/me/qr) yang
 * diperbarui otomatis sebelum kedaluwarsa, plus ID member untuk diketik bila QR tidak terbaca.
 */
export function MemberQrSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, loyalty } = useSession();
  const [qr, setQr] = useState<MemberQr | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [attempt, setAttempt] = useState(0);

  // Ambil QR saat sheet dibuka, dan lagi setiap kali QR lama kedaluwarsa.
  const expired = !!qr && now >= qr.expires_at;
  useEffect(() => {
    if (!visible || (qr && !expired)) return;
    let cancelled = false;
    api<MemberQr>('/me/qr')
      .then((res) => {
        if (cancelled) return;
        setQr(res);
        setError(null);
        setNow(Math.floor(Date.now() / 1000));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'QR gagal dimuat.');
      });
    return () => {
      cancelled = true;
    };
  }, [visible, qr, expired, attempt]);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, [visible]);

  if (!user) return null;

  const secondsLeft = qr ? Math.max(0, qr.expires_at - now) : 0;
  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Tutup kartu member" />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.head}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt weight="extrabold" size={18} accessibilityRole="header">
              Kartu Member
            </Txt>
            <Txt size={13} color={colors.muted}>
              Tunjukkan ke kasir saat membayar.
            </Txt>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Tutup" onPress={onClose} hitSlop={10} style={styles.close}>
            <Icon name="back" size={18} color={colors.ink} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.member}>
            <TierMedal tier={loyalty?.tier ?? user.tier} size={34} />
            <View style={{ flex: 1 }}>
              <Txt weight="bold" size={15} numberOfLines={1}>
                {user.name}
              </Txt>
              <Txt size={12} color={colors.muted}>
                {loyalty?.tier_label ?? user.tier} · {user.member_code_display}
              </Txt>
            </View>
          </View>

          <View style={styles.qrBox} accessible accessibilityRole="image" accessibilityLabel="Kode QR member untuk dipindai kasir">
            {qr && !expired ? (
              <QRCode value={qr.payload} size={196} color={colors.ink} backgroundColor="#FFFFFF" ecl="M" />
            ) : error ? (
              <View style={{ alignItems: 'center', gap: 10, paddingHorizontal: 12 }}>
                <Txt size={13} color={colors.danger} style={{ textAlign: 'center' }}>
                  {error}
                </Txt>
                <Button title="Coba lagi" variant="outline" onPress={() => setAttempt((n) => n + 1)} />
              </View>
            ) : (
              <ActivityIndicator color={colors.primary} />
            )}
          </View>

          <Txt weight="extrabold" size={20} style={{ letterSpacing: 2, textAlign: 'center' }} selectable>
            {user.member_code_display}
          </Txt>
          <Txt size={12} color={colors.muted} style={{ textAlign: 'center' }}>
            {qr && !expired ? `QR diperbarui otomatis dalam ${countdown}` : 'Menyiapkan QR…'}
          </Txt>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.shade },
  sheet: { backgroundColor: colors.ground, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingBottom: 12 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginTop: 10, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, paddingBottom: 14 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-90deg' }],
  },
  card: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 12, marginBottom: 8 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  qrBox: { alignSelf: 'center', width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
});
