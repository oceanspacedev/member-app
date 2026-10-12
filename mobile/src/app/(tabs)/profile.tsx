import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeleteAccountSheet } from '@/components/delete-account-sheet';
import { Icon, type IconName } from '@/components/icon';
import { UserAvatar } from '@/components/media';
import { Banner, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, ApiError, upload } from '@/lib/api';
import { longDate, number, phone } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { User } from '@/lib/types';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

export default function ProfileScreen() {
  const { user, loyalty, signOut, setUser } = useSession();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  // Aksi yang menunggu sheet selesai menutup (iOS).
  const [pending, setPending] = useState<'library' | 'camera' | null>(null);

  if (!user) return null;

  const isStaff = user.role === 'cashier' || user.role === 'admin';
  const birthMonth = user.birth_date ? Number(user.birth_date.split('-')[1]) : null;
  const isBirthdayMonth = birthMonth === new Date().getMonth() + 1;

  async function sendAvatar(result: ImagePicker.ImagePickerResult) {
    const asset = result.canceled ? null : result.assets?.[0];
    if (!asset) return;

    setUploading(true);
    try {
      const res = await upload<{ data: User }>('/me/avatar', {
        uri: asset.uri,
        name: asset.fileName ?? 'foto-profil.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      });
      setUser(res.data);
      setAvatarMessage({ tone: 'info', text: 'Foto profil diperbarui.' });
    } catch (e) {
      setAvatarMessage({ tone: 'error', text: e instanceof ApiError ? e.message : 'Gagal mengunggah foto.' });
    } finally {
      setUploading(false);
    }
  }

  /**
   * Tutup sheet lalu jalankan aksinya.
   * - iOS: menolak membuka galeri/kamera selagi Modal masih menutup, jadi aksi ditunda ke onDismiss.
   * - Web: picker harus dipanggil langsung dari ketukan (tanpa jeda), kalau tidak diblokir browser.
   */
  function afterSheetCloses(action: 'library' | 'camera') {
    setAvatarMessage(null);
    setSheetOpen(false);
    if (Platform.OS === 'ios') {
      setPending(action);
      return;
    }
    run(action);
  }

  function run(action: 'library' | 'camera') {
    if (action === 'library') {
      ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS).then(sendAvatar, pickerFailed);
    } else {
      void openCamera();
    }
  }

  function pickerFailed() {
    setAvatarMessage({ tone: 'error', text: 'Galeri/kamera tidak bisa dibuka. Coba lagi, atau izinkan aksesnya di pengaturan HP.' });
  }

  async function openCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setAvatarMessage({ tone: 'error', text: 'Izin kamera ditolak. Aktifkan di pengaturan HP untuk memotret foto profil.' });
      return;
    }
    ImagePicker.launchCameraAsync({ ...PICKER_OPTIONS, cameraType: ImagePicker.CameraType.front }).then(sendAvatar, pickerFailed);
  }

  const pickFromLibrary = () => afterSheetCloses('library');
  const takePhoto = () => afterSheetCloses('camera');

  async function removePhoto() {
    setSheetOpen(false);
    setUploading(true);
    try {
      const res = await api<{ data: User }>('/me/avatar', { method: 'DELETE' });
      setUser(res.data);
      setAvatarMessage({ tone: 'info', text: 'Foto profil dihapus.' });
    } catch (e) {
      setAvatarMessage({ tone: 'error', text: e instanceof ApiError ? e.message : 'Gagal menghapus foto.' });
    } finally {
      setUploading(false);
    }
  }

  const sheetOptions: { label: string; icon: IconName; onPress: () => void; danger?: boolean }[] = [
    { label: 'Pilih dari galeri', icon: 'image', onPress: pickFromLibrary },
    ...(Platform.OS !== 'web' ? [{ label: 'Ambil foto', icon: 'camera' as IconName, onPress: takePhoto }] : []),
    ...(user.avatar_url ? [{ label: 'Hapus foto', icon: 'trash' as IconName, onPress: removePhoto, danger: true }] : []),
  ];

  const stats: { label: string; value: string; go: () => void }[] = [
    { label: 'Poin', value: number(loyalty?.points_balance ?? user.points_balance), go: () => router.push('/points') },
    { label: 'Voucher aktif', value: number(loyalty?.active_vouchers ?? 0), go: () => router.push('/vouchers') },
    { label: 'Level', value: loyalty?.tier_label ?? user.tier, go: () => router.push('/tiers') },
  ];

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: 'Data diri',
      rows: [
        { icon: 'phone', label: 'Nomor WhatsApp', value: phone(user.phone) },
        { icon: 'mail', label: 'Email', value: user.email ?? 'Belum diisi' },
        { icon: 'gift', label: 'Tanggal lahir', value: user.birth_date ? longDate(user.birth_date) : 'Belum diisi' },
      ],
    },
    {
      title: 'Aktivitas',
      rows: [
        { icon: 'ticket', label: 'Voucher Saya', go: () => router.push('/vouchers') },
        { icon: 'receipt', label: 'Riwayat poin', go: () => router.push('/points') },
        { icon: 'crown', label: 'Level & benefit member', go: () => router.push('/tiers') },
      ],
    },
    ...(isStaff ? [{ title: 'Kasir', rows: [{ icon: 'scan' as IconName, label: 'Mode Kasir', value: 'Scan QR member & voucher', go: () => router.push('/cashier') }] }] : []),
    {
      title: 'Lainnya',
      rows: [
        { icon: 'store', label: 'Outlet terdekat', go: () => router.navigate('/outlets') },
        { icon: 'grid', label: 'Brand grup', go: () => router.push('/brands') },
      ],
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      {focused && <StatusBar style="light" />}
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={user.avatar_url ? 'Ubah foto profil' : 'Tambah foto profil'}
            onPress={() => setSheetOpen(true)}
            disabled={uploading}
            style={styles.avatarButton}>
            <View style={styles.avatarRing}>
              <UserAvatar name={user.name} uri={user.avatar_url} size={84} />
            </View>
            {uploading && (
              <View style={styles.avatarBusy}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Icon name="camera" size={15} color={colors.accentInk} strokeWidth={2.2} />
            </View>
          </Pressable>
          <Txt weight="extrabold" size={20} color="#FFFFFF" style={{ textAlign: 'center' }} accessibilityRole="header">
            {user.name}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.tierPill}>
              <Txt weight="extrabold" size={11} color={colors.accentInk} style={{ letterSpacing: 1 }}>
                {(loyalty?.tier_label ?? user.tier).toUpperCase()}
              </Txt>
            </View>
            <Txt weight="medium" size={13} color={colors.onPrimaryMuted} style={{ letterSpacing: 1 }}>
              {user.member_code_display}
            </Txt>
          </View>
        </View>

        <View style={styles.stats}>
          {stats.map((s, i) => (
            <Pressable
              key={s.label}
              accessibilityRole="button"
              accessibilityLabel={`${s.label}: ${s.value}`}
              onPress={s.go}
              style={({ pressed }) => [styles.stat, i > 0 && styles.statDivider, pressed && { opacity: 0.7 }]}>
              <Txt weight="extrabold" size={17}>
                {s.value}
              </Txt>
              <Txt size={12} color={colors.muted}>
                {s.label}
              </Txt>
            </Pressable>
          ))}
        </View>

        <View style={styles.body}>
          {avatarMessage && <Banner tone={avatarMessage.tone} icon={avatarMessage.tone === 'info' ? 'check' : 'info'} text={avatarMessage.text} />}
          {isBirthdayMonth && <Banner tone="gold" icon="gift" text="Selamat ulang tahun! Cek Voucher Saya untuk hadiah ulang tahunmu." />}

          {sections.map((section) => (
            <View key={section.title} style={{ gap: 8 }}>
              <Txt weight="extrabold" size={12} color={colors.muted} style={{ letterSpacing: 0.8, paddingHorizontal: 4 }} accessibilityRole="header">
                {section.title.toUpperCase()}
              </Txt>
              <View style={styles.group}>
                {section.rows.map((row, i) => (
                  <ProfileRow key={row.label} row={row} first={i === 0} />
                ))}
              </View>
            </View>
          ))}

          <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]}>
            <Icon name="logout" size={20} color={colors.danger} strokeWidth={2} />
            <Txt weight="bold" size={15} color={colors.danger}>
              Keluar
            </Txt>
          </Pressable>
          {/* Akun kasir/admin dihapus oleh admin dari panel. */}
          {!isStaff && (
            <Pressable accessibilityRole="button" onPress={() => setDeleteOpen(true)} hitSlop={8} style={{ alignSelf: 'center' }}>
              <Txt weight="semibold" size={13} color={colors.muted} style={{ textDecorationLine: 'underline' }}>
                Hapus akun
              </Txt>
            </Pressable>
          )}
          <Txt size={12} color={colors.subtle} style={{ textAlign: 'center' }}>
            Ocean Space · versi {Constants.expoConfig?.version ?? '1.0.0'}
          </Txt>
        </View>
      </ScrollView>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSheetOpen(false)}
        onDismiss={() => {
          // iOS: sheet sudah benar-benar tertutup, sekarang aman membuka galeri/kamera.
          if (pending) run(pending);
          setPending(null);
        }}>
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)} accessibilityLabel="Tutup" />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />
          <Txt weight="extrabold" size={16} style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
            Foto profil
          </Txt>
          {sheetOptions.map((o) => (
            <Pressable key={o.label} accessibilityRole="button" onPress={o.onPress} style={styles.sheetRow}>
              <Icon name={o.icon} size={22} color={o.danger ? colors.danger : colors.primary} />
              <Txt weight="semibold" size={15} color={o.danger ? colors.danger : colors.ink}>
                {o.label}
              </Txt>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={() => setSheetOpen(false)} style={[styles.sheetRow, { justifyContent: 'center' }]}>
            <Txt weight="bold" size={15} color={colors.muted}>
              Batal
            </Txt>
          </Pressable>
        </SafeAreaView>
      </Modal>

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
    </View>
  );
}

type Row = { icon: IconName; label: string; value?: string; go?: () => void };

/** Satu baris di grup profil: info (label + nilai) atau tautan (dengan panah). */
function ProfileRow({ row, first }: { row: Row; first: boolean }) {
  const content = (
    <>
      <View style={styles.rowIcon}>
        <Icon name={row.icon} size={19} color={colors.ink} strokeWidth={1.8} />
      </View>
      {row.go ? (
        // Tautan: judul tebal, keterangan kecil di bawahnya (opsional).
        <View style={{ flex: 1, gap: 2 }}>
          <Txt weight="semibold" size={15}>
            {row.label}
          </Txt>
          {row.value && (
            <Txt size={12} color={colors.muted}>
              {row.value}
            </Txt>
          )}
        </View>
      ) : (
        // Info: label kecil di atas, nilainya tebal.
        <View style={{ flex: 1, gap: 2 }}>
          <Txt size={12} color={colors.muted}>
            {row.label}
          </Txt>
          <Txt weight="semibold" size={15}>
            {row.value}
          </Txt>
        </View>
      )}
      {row.go && <Icon name="chevron" size={18} color={colors.subtle} strokeWidth={2} />}
    </>
  );

  return row.go ? (
    <Pressable accessibilityRole="button" onPress={row.go} style={({ pressed }) => [styles.row, !first && styles.divider, pressed && { backgroundColor: colors.lineSoft }]}>
      {content}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={`${row.label}: ${row.value}`} style={[styles.row, !first && styles.divider]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.primary, alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 52 },
  avatarButton: { width: 92, height: 92, marginBottom: 4 },
  avatarRing: { width: 92, height: 92, borderRadius: 46, borderWidth: 4, borderColor: colors.primaryMid, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarBusy: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 46, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.accent },
  // Kartu ringkasan menumpang di tepi bawah header.
  stats: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -32,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: '0 6px 20px rgba(24, 24, 27, 0.08)',
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.lineSoft },
  body: { padding: 16, paddingTop: 20, gap: 20 },
  group: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 58 },
  rowIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  divider: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  logout: {
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
  backdrop: { flex: 1, backgroundColor: 'rgba(24, 24, 27, 0.45)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingBottom: 8 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 12 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, minHeight: 56 },
});
