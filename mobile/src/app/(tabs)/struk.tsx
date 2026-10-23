import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { GuestPrompt } from '@/components/guest-prompt';
import { Icon, type IconName } from '@/components/icon';
import { MemberQrSheet } from '@/components/member-qr-sheet';
import { cropPhoto, FULL_CROP, ReceiptCropper, type CropRect } from '@/components/receipt-cropper';
import { Banner, Button, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, ApiError, upload } from '@/lib/api';
import { number, rupiah } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import type { ReceiptClaim } from '@/lib/types';

// Kualitas cukup tinggi agar angka kecil di struk tetap terbaca oleh pemeriksa otomatis.
const QUALITY = 0.8;
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: QUALITY };

// Selama sistem membaca struk, aplikasi mengecek hasil secara berkala. Setelah batas ini member
// tidak perlu menunggu di layar: hasilnya dikirim lewat WhatsApp.
const POLL_MS = 2500;
const MAX_WAIT_MS = 75_000;

/** Foto struk beserta potongannya (awal: area bingkai kamera, lalu bisa diatur member). */
type Photo = { uri: string; name: string; type: string; crop: CropRect };

type Box = { x: number; y: number; width: number; height: number };

/** Posisi & ukuran view di layar saat ini, atau null bila belum tampil. */
function measureInWindow(view: View | null): Promise<Box | null> {
  return new Promise((resolve) => {
    if (!view) return resolve(null);
    view.measureInWindow((x, y, width, height) => resolve(width > 0 && height > 0 ? { x, y, width, height } : null));
  });
}

/**
 * Potongan awal dari bingkai panduan di layar. Pratinjau kamera mengisi layar (cover), jadi posisi
 * bingkai dipetakan ke piksel foto dengan skala yang sama, ditambah sedikit ruang agar tepi nota tidak terpotong.
 */
function frameCrop(photo: { width: number; height: number }, screen: { width: number; height: number }, frame: Box): CropRect {
  const scale = Math.max(screen.width / photo.width, screen.height / photo.height);
  const offsetX = (screen.width - photo.width * scale) / 2;
  const offsetY = (screen.height - photo.height * scale) / 2;
  const margin = 14;
  const toX = (px: number) => Math.min(1, Math.max(0, (px - offsetX) / (photo.width * scale)));
  const toY = (px: number) => Math.min(1, Math.max(0, (px - offsetY) / (photo.height * scale)));
  const x = toX(frame.x - margin);
  const y = toY(frame.y - margin);
  const width = toX(frame.x + frame.width + margin) - x;
  const height = toY(frame.y + frame.height + margin) - y;
  return width > 0.1 && height > 0.1 ? { x, y, width, height } : FULL_CROP;
}

/**
 * Tab tengah "Foto Struk": cara member mendapat poin. Outlet memakai POS pihak ketiga, jadi member
 * cukup memfoto struk. Kamera langsung terbuka; sistem membaca outlet, nomor, tanggal, dan total, lalu
 * poin masuk otomatis — hanya struk yang meragukan yang dicek petugas.
 */
export default function StrukScreen() {
  const { status } = useSession();
  const focused = useIsFocused();

  if (status === 'guest') {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center' }} edges={['top']}>
        {focused && <StatusBar style="dark" />}
        <GuestPrompt
          icon="camera"
          title="Foto struk, dapat poin"
          text="Masuk untuk mengirim foto struk belanja dari outlet Space Club. Poin langsung masuk ke akunmu setelah struk diperiksa."
        />
      </SafeAreaView>
    );
  }
  return <ReceiptCapture focused={focused} />;
}

function ReceiptCapture({ focused }: { focused: boolean }) {
  const { refresh } = useSession();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claim, setClaim] = useState<ReceiptClaim | null>(null);

  const claimId = claim?.id;
  const checking = !!claim?.checking;

  // Tunggu hasil pemeriksaan sistem.
  useEffect(() => {
    if (!claimId || !checking) return;
    const started = Date.now();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await api<{ data: ReceiptClaim }>(`/me/receipts/${claimId}`);
        if (stopped) return;
        if (!res.data.checking) {
          setClaim(res.data);
          if (res.data.status === 'approved') void refresh().catch(() => undefined);
          return;
        }
      } catch {
        // Sinyal putus sesaat: coba lagi di putaran berikutnya.
      }
      if (stopped) return;
      if (Date.now() - started > MAX_WAIT_MS) {
        setClaim((c) => (c ? { ...c, checking: false, in_review: true } : c));
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };
    timer = setTimeout(poll, POLL_MS);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [claimId, checking, refresh]);

  async function pickFromLibrary() {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      const asset = result.canceled ? null : result.assets?.[0];
      if (asset) setPhoto({ uri: asset.uri, name: asset.fileName ?? 'struk.jpg', type: asset.mimeType ?? 'image/jpeg', crop: FULL_CROP });
    } catch {
      setError('Galeri tidak bisa dibuka. Coba lagi.');
    }
  }

  async function submit() {
    if (!photo) return;
    setBusy(true);
    setError(null);
    try {
      // Kirim hanya bagian nota. Bila pemotongan gagal, foto utuh tetap bisa dibaca sistem.
      const cropped = await cropPhoto(photo.uri, photo.crop).catch(() => photo.uri);
      const file = cropped === photo.uri ? photo : { uri: cropped, name: 'struk.jpg', type: 'image/jpeg' };
      const res = await upload<{ data: ReceiptClaim }>('/me/receipts', file, { field: 'photo' });
      setClaim(res.data);
    } catch (e) {
      haptics.error();
      setError(e instanceof ApiError ? e.message : 'Gagal mengirim struk.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setClaim(null);
    setPhoto(null);
    setError(null);
  }

  if (claim) {
    return (
      <>
        {focused && <StatusBar style="dark" />}
        <ReceiptResult claim={claim} onRetake={reset} />
      </>
    );
  }

  return (
    <View style={styles.screen}>
      {focused && <StatusBar style="light" />}
      {photo ? (
        <CropStep
          key={photo.uri}
          photo={photo}
          busy={busy}
          error={error}
          onCrop={(crop) => setPhoto((p) => (p ? { ...p, crop } : p))}
          onRetake={() => setPhoto(null)}
          onSubmit={submit}
        />
      ) : (
        <CameraStep focused={focused} error={error} onPhoto={setPhoto} onLibrary={pickFromLibrary} />
      )}
    </View>
  );
}

/** Bayangan tipis di tepi atas/bawah kamera agar tombol & teks putih tetap terbaca di atas foto terang. */
function Shade({ edge, height }: { edge: 'top' | 'bottom'; height: number }) {
  const id = `shade${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const top = edge === 'top';
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, height, [edge]: 0 }} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000000" stopOpacity={top ? 0.5 : 0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={top ? 0 : 0.6} />
          </LinearGradient>
        </Defs>
        <Rect width="1" height="1" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** Area tombol di bawah layar, di atas garis navigasi HP (tab bar disembunyikan di layar ini). */
function BottomArea({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>{children}</View>;
}

/** Bulat "kaca" di atas kamera untuk tombol kecil (tutup, galeri, lampu). */
function GlassButton({ icon, label, onPress, active }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active !== undefined ? { selected: active } : undefined}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.glass, active && styles.glassActive, pressed && { opacity: 0.75 }]}>
      <Icon name={icon} size={20} color={active ? colors.primary : '#FFFFFF'} strokeWidth={2.1} />
    </Pressable>
  );
}

/** Tombol samping tombol jepret: ikon bulat + label kecil. */
function SideAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.side, pressed && { opacity: 0.75 }]}>
      <View style={styles.sideIcon}>
        <Icon name={icon} size={22} color="#FFFFFF" strokeWidth={1.9} />
      </View>
      <Txt weight="semibold" size={12} color="#FFFFFF">
        {label}
      </Txt>
    </Pressable>
  );
}

function TopBar({ title, children, onClose }: { title: string; children?: ReactNode; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
      <GlassButton icon="close" label="Tutup" onPress={onClose} />
      <Txt weight="bold" size={17} color="#FFFFFF" style={{ flex: 1, textAlign: 'center' }} accessibilityRole="header">
        {title}
      </Txt>
      <View style={styles.topRight}>{children ?? <View style={{ width: 40 }} />}</View>
    </View>
  );
}

/** Kamera langsung terbuka: bingkai panduan struk, jepret, galeri & lampu di atas, kartu member di bawah. */
function CameraStep({
  focused,
  error,
  onPhoto,
  onLibrary,
}: {
  focused: boolean;
  error: string | null;
  onPhoto: (p: Photo) => void;
  onLibrary: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  // Area kamera dan bingkai panduan, diukur saat jepret untuk potongan awal foto.
  const areaRef = useRef<View>(null);
  const frameRef = useRef<View>(null);
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  // Kamera dilepas saat pindah tab (hemat baterai, tidak bentrok dengan kamera kasir); saat kembali,
  // tunggu kamera siap lagi sebelum tombol jepret aktif. Lampu ikut dimatikan.
  useFocusEffect(
    useCallback(
      () => () => {
        setReady(false);
        setTorch(false);
      },
      [],
    ),
  );
  const [shotError, setShotError] = useState<string | null>(null);

  // Minta izin kamera saat tab dibuka pertama kali (izin bisa ditanya).
  useEffect(() => {
    if (focused && permission && !permission.granted && permission.canAskAgain && permission.status === 'undetermined') void requestPermission();
  }, [focused, permission, requestPermission]);

  async function shoot() {
    if (!camera.current || !ready || shooting) return;
    setShooting(true);
    setShotError(null);
    haptics.tap();
    try {
      const [pic, area, frame] = await Promise.all([
        camera.current.takePictureAsync({ quality: QUALITY }),
        measureInWindow(areaRef.current),
        measureInWindow(frameRef.current),
      ]);
      if (pic?.uri) {
        // Sebagian kamera (mis. di web) tidak melaporkan ukuran foto: baca dari gambarnya.
        const size = pic.width > 0 && pic.height > 0 ? pic : await Image.getSize(pic.uri).catch(() => null);
        const crop =
          area && frame && size ? frameCrop(size, area, { x: frame.x - area.x, y: frame.y - area.y, width: frame.width, height: frame.height }) : FULL_CROP;
        onPhoto({ uri: pic.uri, name: 'struk.jpg', type: 'image/jpeg', crop });
      }
    } catch {
      setShotError('Foto gagal diambil. Coba lagi, atau pilih dari galeri.');
    } finally {
      setShooting(false);
    }
  }

  const granted = !!permission?.granted;
  const blocked = permission && !permission.granted && !permission.canAskAgain;

  return (
    <>
      {granted && focused ? (
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          onCameraReady={() => setReady(true)}
        />
      ) : null}

      {granted && focused ? (
        <>
          <Shade edge="top" height={insets.top + 110} />
          <Shade edge="bottom" height={insets.bottom + 210} />
        </>
      ) : null}

      {granted ? (
        <View ref={areaRef} style={[styles.frameArea, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 150 }]} pointerEvents="none">
          <View ref={frameRef} style={styles.frame}>
            {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
              <View key={c} style={[styles.corner, styles[c]]} />
            ))}
          </View>
          <View style={styles.hint}>
            <Txt weight="semibold" size={12} color="#FFFFFF" style={{ textAlign: 'center' }}>
              Masukkan seluruh struk ke dalam bingkai
            </Txt>
          </View>
        </View>
      ) : (
        <View style={styles.permission}>
          <View style={styles.permissionIcon}>
            <Icon name="camera" size={30} color="#FFFFFF" strokeWidth={1.9} />
          </View>
          <Txt weight="bold" size={18} color="#FFFFFF" style={{ textAlign: 'center' }}>
            {blocked ? 'Akses kamera dimatikan' : 'Izinkan kamera'}
          </Txt>
          <Txt size={14} color="rgba(255,255,255,0.75)" style={{ textAlign: 'center', lineHeight: 20 }}>
            {blocked
              ? 'Aktifkan izin kamera untuk Space Club di Pengaturan HP, atau pilih foto struk dari galeri.'
              : 'Kamera dipakai untuk memotret struk belanja agar poin bisa masuk ke akunmu.'}
          </Txt>
          <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 6 }}>
            <Button
              title={blocked ? 'Buka Pengaturan' : 'Izinkan kamera'}
              variant="light"
              onPress={() => (blocked ? void Linking.openSettings() : void requestPermission())}
            />
            <Pressable accessibilityRole="button" onPress={onLibrary} style={{ alignSelf: 'center', padding: 8 }}>
              <Txt weight="semibold" size={14} color="#FFFFFF">
                Pilih dari galeri
              </Txt>
            </Pressable>
          </View>
        </View>
      )}

      <TopBar title="Foto Struk" onClose={() => router.navigate('/')}>
        <GlassButton icon="image" label="Pilih dari galeri" onPress={onLibrary} />
        {granted && <GlassButton icon="flash" label={torch ? 'Matikan lampu' : 'Nyalakan lampu'} onPress={() => setTorch((v) => !v)} active={torch} />}
      </TopBar>

      <BottomArea>
        {(error || shotError) && <Banner tone="error" text={(error ?? shotError)!} />}
        {granted && (
          <View style={styles.controls}>
            <SideAction icon="qr" label="Kartu Member" onPress={() => setCardOpen(true)} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Jepret foto struk"
              accessibilityState={{ disabled: !ready || shooting }}
              disabled={!ready || shooting}
              onPress={shoot}
              style={[styles.shutter, (!ready || shooting) && { opacity: 0.6 }]}>
              {({ pressed }) => (
                <View style={[styles.shutterInner, pressed && { transform: [{ scale: 0.9 }] }]}>{shooting && <ActivityIndicator color={colors.primary} />}</View>
              )}
            </Pressable>
            <SideAction icon="clock" label="Riwayat" onPress={() => router.push('/points')} />
          </View>
        )}
        <Txt size={12} color="rgba(255,255,255,0.7)" style={{ textAlign: 'center' }}>
          Poin masuk otomatis setelah struk diperiksa.
        </Txt>
      </BottomArea>

      <MemberQrSheet visible={cardOpen} onClose={() => setCardOpen(false)} />
    </>
  );
}

/** Atur potongan agar hanya nota yang terkirim, lalu kirim. */
function CropStep({
  photo,
  busy,
  error,
  onCrop,
  onRetake,
  onSubmit,
}: {
  photo: Photo;
  busy: boolean;
  error: string | null;
  onCrop: (crop: CropRect) => void;
  onRetake: () => void;
  onSubmit: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <>
      <View style={{ flex: 1, paddingTop: insets.top + 60 }}>
        <ReceiptCropper uri={photo.uri} initial={photo.crop} onChange={onCrop} style={{ marginBottom: 8 }} />
        <View style={[styles.previewBottom, { paddingBottom: insets.bottom + 16 }]}>
          {error && <Banner tone="error" text={error} />}
          <Txt size={13} color="rgba(255,255,255,0.75)" style={{ textAlign: 'center' }}>
            Geser sudut agar pas dengan nota. Pastikan outlet, tanggal, dan total terbaca.
          </Txt>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Foto ulang" variant="secondary" icon="refresh" onPress={onRetake} disabled={busy} style={{ flex: 1 }} />
            <Button title="Kirim struk" variant="brass" onPress={onSubmit} loading={busy} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
      {/* Setelah konten agar tombol tutup tetap bisa ditekan di atas area foto. */}
      <TopBar title="Atur potongan" onClose={onRetake} />
    </>
  );
}

/** Hasil pemeriksaan: sedang dibaca, poin masuk, perlu foto ulang, atau dicek petugas. */
function ReceiptResult({ claim, onRetake }: { claim: ReceiptClaim; onRetake: () => void }) {
  const approved = claim.status === 'approved';
  const rejected = claim.status === 'rejected';

  // Hasil akhir terasa di tangan: getar sukses saat poin masuk, getar peringatan bila struk ditolak.
  useEffect(() => {
    if (claim.checking) return;
    if (approved) haptics.success();
    else if (rejected) haptics.warning();
  }, [claim.checking, approved, rejected]);

  const title = claim.checking
    ? 'Memeriksa struk…'
    : approved
      ? `+${number(claim.points ?? 0)} poin`
      : rejected
        ? 'Struk belum bisa diproses'
        : 'Struk sedang dicek petugas';
  const text = claim.checking
    ? 'Biasanya hanya beberapa detik.'
    : approved
      ? `Poin dari ${claim.outlet?.name ?? 'struk ini'}${claim.amount != null ? ` (${rupiah(claim.amount)})` : ''} sudah masuk ke akunmu.`
      : rejected
        ? (claim.reject_reason ?? 'Coba foto ulang struknya.')
        : 'Struk ini perlu dicek lebih lanjut. Kamu tidak perlu melakukan apa pun; hasilnya kami kirim lewat WhatsApp.';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <View style={styles.resultBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke Beranda"
          hitSlop={8}
          onPress={() => {
            onRetake();
            router.navigate('/');
          }}
          style={({ pressed }) => [styles.resultClose, pressed && { opacity: 0.6 }]}>
          <Icon name="close" size={22} color={colors.ink} strokeWidth={2.1} />
        </Pressable>
      </View>
      <View style={styles.done} accessibilityLiveRegion="polite">
        <Animated.View
          key={claim.checking ? 'checking' : claim.status}
          entering={ZoomIn.springify().damping(12)}
          style={[styles.doneIcon, rejected ? styles.iconRejected : !approved ? styles.iconWaiting : null]}>
          {claim.checking ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Icon
              name={approved ? 'check' : rejected ? 'info' : 'clock'}
              size={32}
              color={approved ? colors.success : rejected ? colors.danger : colors.accentText}
              strokeWidth={2.4}
            />
          )}
        </Animated.View>
        <Txt weight="extrabold" size={22} style={{ textAlign: 'center' }} accessibilityRole="header">
          {title}
        </Txt>
        <Txt size={14} color={colors.muted} style={{ textAlign: 'center', lineHeight: 21 }}>
          {text}
        </Txt>
        {!claim.checking && (
          <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 12 }}>
            {rejected ? (
              <Button title="Foto ulang" variant="brass" icon="camera" onPress={onRetake} />
            ) : (
              <Button title="Lihat riwayat poin" onPress={() => router.push('/points')} />
            )}
            <Button title={rejected ? 'Nanti saja' : 'Kirim struk lain'} variant="secondary" onPress={onRetake} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const CORNER = 28;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#05070F' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  topRight: { flexDirection: 'row', gap: 10 },
  glass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  frameArea: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 14 },
  frame: { width: '78%', aspectRatio: 0.72, maxHeight: '62%' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#FFFFFF' },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 },
  hint: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(15, 23, 42, 0.55)' },
  permission: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 120, gap: 10 },
  permissionIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, gap: 14 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  side: { width: 92, alignItems: 'center', gap: 6 },
  sideIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  previewBottom: { paddingHorizontal: 20, gap: 14 },
  resultBar: { paddingHorizontal: 16, paddingTop: 8 },
  resultClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  doneIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E7F4EC', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  iconRejected: { backgroundColor: '#FBECE8' },
  iconWaiting: { backgroundColor: colors.accentSoft },
});
