import * as ImagePicker from 'expo-image-picker';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AboutGroup, AppVersion } from '@/components/about';
import { GuestPrompt } from '@/components/guest-prompt';
import { Icon, type IconName } from '@/components/icon';
import { UserAvatar } from '@/components/media';
import { MenuGroup, type MenuRowItem } from '@/components/menu-row';
import { Banner, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, ApiError, upload } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { number } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import type { User } from '@/lib/types';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

export default function ProfileScreen() {
  const { status } = useSession();
  return status === 'guest' ? <GuestProfile /> : <MemberProfile />;
}

/** Tamu: ajakan masuk, plus halaman publik yang tetap bisa dibuka tanpa akun. */
function GuestProfile() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const rows: MenuRowItem[] = [
    { icon: 'crown', label: 'Level & benefit member', go: () => router.push('/tiers') },
    { icon: 'store', label: 'Outlet terdekat', go: () => router.navigate('/outlets') },
    { icon: 'grid', label: 'Brand grup', go: () => router.push('/brands') },
  ];

  return (
    <View style={{ flex: 1 }}>
      {focused && <StatusBar style="light" />}
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={[styles.header, { paddingTop: insets.top + 8, paddingBottom: 8 }]}>
          <GuestPrompt
            dark
            icon="user"
            title="Kamu masuk sebagai tamu"
            text="Masuk dengan nomor WhatsApp untuk kumpulkan poin dari struk belanja dan simpan voucher di semua brand Ocean Space."
          />
        </View>
        <View style={styles.body}>
          <MenuGroup title="Jelajahi" rows={rows} />
          <AboutGroup />
          <AppVersion />
        </View>
      </ScrollView>
    </View>
  );
}

function MemberProfile() {
  const { user, loyalty, signOut, setUser } = useSession();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [sheetOpen, setSheetOpen] = useState(false);
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

  function confirmLogout() {
    haptics.warning();
    confirmAction({
      title: 'Keluar dari akun?',
      message: 'Kamu bisa masuk lagi kapan saja dengan nomor WhatsApp yang sama. Poin dan vouchermu tetap aman.',
      confirmLabel: 'Keluar',
      destructive: true,
      onConfirm: () => void signOut(),
    });
  }

  const stats: { label: string; value: string; go: () => void }[] = [
    { label: 'Poin', value: number(loyalty?.points_balance ?? user.points_balance), go: () => router.push('/points') },
    { label: 'Voucher aktif', value: number(loyalty?.active_vouchers ?? 0), go: () => router.push('/vouchers') },
    { label: 'Level', value: loyalty?.tier_label ?? user.tier, go: () => router.push('/tiers') },
  ];

  const sections: { title: string; rows: MenuRowItem[] }[] = [
    {
      title: 'Akun',
      rows: [{ icon: 'user', label: 'Akun & data diri', go: () => router.push('/account') }],
    },
    {
      title: 'Aktivitas',
      rows: [
        { icon: 'ticket', label: 'Voucher Saya', go: () => router.push('/vouchers') },
        { icon: 'receipt', label: 'Riwayat poin', go: () => router.push('/points') },
        { icon: 'camera', label: 'Kirim struk belanja', value: 'Foto struk untuk klaim poin', go: () => router.navigate('/struk') },
        { icon: 'crown', label: 'Level & benefit member', go: () => router.push('/tiers') },
      ],
    },
    ...(isStaff ? [{ title: 'Kasir', rows: [{ icon: 'scan' as IconName, label: 'Mode Kasir', value: 'Scan QR member & cek kode voucher', go: () => router.push('/cashier') }] }] : []),
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
            <MenuGroup key={section.title} title={section.title} rows={section.rows} />
          ))}

          <AboutGroup />

          <Pressable accessibilityRole="button" onPress={confirmLogout} style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]}>
            <Icon name="logout" size={20} color={colors.danger} strokeWidth={2} />
            <Txt weight="bold" size={15} color={colors.danger}>
              Keluar
            </Txt>
          </Pressable>
          <AppVersion />
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
