import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
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

  const consequences: { icon: IconName; text: string }[] = [
    {
      icon: 'coins',
      text:
        points > 0 || vouchers > 0
          ? `${number(points)} poin${vouchers > 0 ? ` dan ${number(vouchers)} voucher aktif` : ''} hangus`
          : 'Level dan riwayat belanja tidak bisa dipulihkan',
    },
    { icon: 'user', text: 'Data diri dan foto dihapus permanen' },
    { icon: 'logout', text: 'Keluar dari semua perangkat' },
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
          <View style={styles.head}>
            <View style={styles.badge}>
              <Icon name="trash" size={26} color={colors.danger} strokeWidth={2} />
            </View>
            <Txt weight="extrabold" size={20} style={{ textAlign: 'center' }} accessibilityRole="header">
              Hapus akun?
            </Txt>
            <Txt size={14} color={colors.muted} style={{ textAlign: 'center' }}>
              Tindakan ini tidak bisa dibatalkan.
            </Txt>
          </View>

          <View style={styles.list}>
            {consequences.map((c, i) => (
              <View key={c.text} style={[styles.point, i > 0 && styles.divider]}>
                <Icon name={c.icon} size={18} color={colors.danger} strokeWidth={2} />
                <Txt weight="medium" size={14} color={colors.ink} style={{ flex: 1 }}>
                  {c.text}
                </Txt>
              </View>
            ))}
          </View>

          <Field
            label={`Ketik ${CONFIRM_WORD} untuk konfirmasi`}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={CONFIRM_WORD}
            error={error ?? undefined}
            editable={!busy}
          />

          <View style={{ gap: 4 }}>
            <Button
              title="Hapus akun"
              variant="destructive"
              loading={busy}
              disabled={typed.trim().toUpperCase() !== CONFIRM_WORD}
              onPress={confirm}
            />
            <Pressable accessibilityRole="button" disabled={busy} onPress={close} style={styles.cancel}>
              <Txt weight="bold" size={15} color={colors.muted}>
                Batal
              </Txt>
            </Pressable>
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
  head: { alignItems: 'center', gap: 6, paddingTop: 4 },
  badge: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  list: { borderRadius: 14, backgroundColor: colors.ground, paddingHorizontal: 14 },
  point: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
