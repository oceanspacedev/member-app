import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeleteAccountSheet } from '@/components/delete-account-sheet';
import { Icon } from '@/components/icon';
import { MenuGroup } from '@/components/menu-row';
import { ScreenHeader, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { longDate, phone } from '@/lib/format';
import { useSession } from '@/lib/session';

/** Akun: data diri member dan hapus akun, dipisah dari menu utama profil. */
export default function AccountScreen() {
  const { user, loyalty, signOut } = useSession();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!user) return null;

  const isStaff = user.role === 'cashier' || user.role === 'admin';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScreenHeader title="Akun" />
      <ScrollView contentContainerStyle={styles.body}>
        <MenuGroup
          title="Data diri"
          rows={[
            { icon: 'user', label: 'Nama', value: user.name ?? 'Belum diisi' },
            { icon: 'phone', label: 'Nomor WhatsApp', value: phone(user.phone) },
            { icon: 'mail', label: 'Email', value: user.email ?? 'Belum diisi' },
            { icon: 'gift', label: 'Tanggal lahir', value: user.birth_date ? longDate(user.birth_date) : 'Belum diisi' },
          ]}
        />

        {/* Akun kasir/admin dihapus oleh admin dari panel. */}
        {!isStaff && (
          <View style={{ gap: 8 }}>
            <Pressable accessibilityRole="button" onPress={() => setDeleteOpen(true)} style={({ pressed }) => [styles.delete, pressed && { opacity: 0.7 }]}>
              <Icon name="trash" size={20} color={colors.danger} strokeWidth={2} />
              <Txt weight="bold" size={15} color={colors.danger}>
                Hapus akun
              </Txt>
            </Pressable>
            <Txt size={12} color={colors.muted} style={{ textAlign: 'center', paddingHorizontal: 8, lineHeight: 18 }}>
              Poin dan voucher yang belum dipakai akan hilang permanen.
            </Txt>
          </View>
        )}
      </ScrollView>

      <DeleteAccountSheet
        visible={deleteOpen}
        points={loyalty?.points_balance ?? user.points_balance}
        vouchers={loyalty?.active_vouchers ?? 0}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          setDeleteOpen(false);
          void signOut();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingTop: 4, paddingBottom: 48, gap: 20 },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
