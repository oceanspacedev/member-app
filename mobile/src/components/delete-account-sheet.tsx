import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button, Field, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { number } from '@/lib/format';

const CONFIRM_WORD = 'HAPUS';

type Props = {
  visible: boolean;
  points: number;
  vouchers: number;
  onClose: () => void;
  /** Dipanggil setelah server menghapus akun; token di HP sudah tidak berlaku. */
  onDeleted: () => void;
};

/**
 * Konfirmasi hapus akun: jelaskan apa yang hilang, lalu minta member mengetik HAPUS
 * agar tidak terhapus karena salah ketuk.
 */
export function DeleteAccountSheet({ visible, points, vouchers, onClose, onDeleted }: Props) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consequences = [
    points > 0 || vouchers > 0
      ? `${number(points)} poin${vouchers > 0 ? ` dan ${number(vouchers)} voucher aktif` : ''} hangus.`
      : 'Level member dan riwayat belanjamu tidak bisa dipulihkan.',
    'Nama, nomor WhatsApp, email, foto, dan tanggal lahir dihapus permanen.',
    'Kamu keluar dari semua perangkat.',
    'Nomor yang sama bisa daftar lagi, tapi mulai dari nol.',
  ];

  function close() {
    if (busy) return;
    setTyped('');
    setError(null);
    onClose();
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api('/me', { method: 'DELETE', body: { confirm: true } });
      onDeleted();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menghapus akun. Coba lagi.');
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Tutup" />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.badge}>
            <Icon name="trash" size={22} color={colors.danger} strokeWidth={2} />
          </View>
          <Txt weight="extrabold" size={18} accessibilityRole="header">
            Hapus akun Ocean Space?
          </Txt>

          <View style={{ gap: 8 }}>
            {consequences.map((text) => (
              <View key={text} style={styles.point}>
                <View style={styles.dot} />
                <Txt size={14} color={colors.inkSoft} style={{ flex: 1, lineHeight: 20 }}>
                  {text}
                </Txt>
              </View>
            ))}
          </View>

          <Field
            label={`Ketik ${CONFIRM_WORD} untuk melanjutkan`}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={CONFIRM_WORD}
            error={error ?? undefined}
            editable={!busy}
          />

          <View style={{ gap: 10 }}>
            <Button
              title="Hapus akun permanen"
              variant="danger"
              loading={busy}
              disabled={typed.trim().toUpperCase() !== CONFIRM_WORD}
              onPress={confirm}
            />
            <Button title="Batal" variant="secondary" disabled={busy} onPress={close} />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(24, 24, 27, 0.45)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 16,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line },
  badge: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger, marginTop: 7 },
});
