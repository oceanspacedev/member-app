import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuestPrompt } from '@/components/guest-prompt';
import { Icon } from '@/components/icon';
import { Banner, Button, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, ApiError, upload } from '@/lib/api';
import { number, rupiah } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { ReceiptClaim } from '@/lib/types';

// Kualitas cukup tinggi agar angka kecil di struk tetap terbaca oleh pemeriksa otomatis.
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };

// Selama sistem membaca struk, aplikasi mengecek hasil secara berkala. Setelah batas ini member
// tidak perlu menunggu di layar: hasilnya dikirim lewat WhatsApp.
const POLL_MS = 2500;
const MAX_WAIT_MS = 75_000;

type Photo = { uri: string; name: string; type: string };

/**
 * Tab tengah "Foto Struk": cara member mendapat poin. Outlet memakai POS pihak ketiga, jadi member
 * cukup memfoto struk. Sistem membaca outlet, nomor, tanggal, dan total, lalu poin masuk otomatis;
 * hanya struk yang meragukan yang dicek petugas.
 */
export default function StrukScreen() {
  const { status } = useSession();
  const focused = useIsFocused();

  return (
    <>
      {focused && <StatusBar style="dark" />}
      {status === 'guest' ? (
        <SafeAreaView style={{ flex: 1, justifyContent: 'center' }} edges={['top']}>
          <GuestPrompt
            icon="camera"
            title="Foto struk, dapat poin"
            text="Masuk untuk mengirim foto struk belanja dari outlet Ocean Space. Poin langsung masuk ke akunmu setelah struk diperiksa."
          />
        </SafeAreaView>
      ) : (
        <ReceiptForm />
      )}
    </>
  );
}

function ReceiptForm() {
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

  async function pick(source: 'camera' | 'library') {
    setError(null);
    if (source === 'camera' && Platform.OS !== 'web') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Izin kamera ditolak. Aktifkan di pengaturan HP, atau pilih foto dari galeri.');
        return;
      }
    }
    try {
      const result = source === 'camera' && Platform.OS !== 'web' ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS) : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      const asset = result.canceled ? null : result.assets?.[0];
      if (asset) setPhoto({ uri: asset.uri, name: asset.fileName ?? 'struk.jpg', type: asset.mimeType ?? 'image/jpeg' });
    } catch {
      setError('Kamera/galeri tidak bisa dibuka. Coba lagi.');
    }
  }

  async function submit() {
    if (!photo) return;
    setBusy(true);
    setError(null);
    try {
      const res = await upload<{ data: ReceiptClaim }>('/me/receipts', photo, { field: 'photo' });
      setClaim(res.data);
    } catch (e) {
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

  if (claim) return <ReceiptResult claim={claim} onRetake={reset} />;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={{ gap: 6 }}>
          <Txt weight="extrabold" size={26} accessibilityRole="header">
            Foto Struk
          </Txt>
          <Txt size={14} color={colors.muted} style={{ lineHeight: 20 }}>
            Foto struk belanja dari outlet Ocean Space. Kami periksa otomatis dan poin langsung masuk.
          </Txt>
        </View>

        {photo ? (
          <View style={styles.preview}>
            <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel="Foto struk" />
            <Pressable accessibilityRole="button" onPress={() => pick('camera')} style={styles.retake} hitSlop={8}>
              <Icon name="refresh" size={16} color="#FFFFFF" strokeWidth={2.2} />
              <Txt weight="bold" size={12} color="#FFFFFF">
                Foto ulang
              </Txt>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Foto struk dengan kamera"
              onPress={() => pick('camera')}
              style={({ pressed }) => [styles.capture, pressed && { opacity: 0.85 }]}>
              <View style={styles.captureIcon}>
                <Icon name="camera" size={30} color={colors.accentInk} strokeWidth={2} />
              </View>
              <Txt weight="bold" size={16}>
                Foto struk
              </Txt>
              <Txt size={12} color={colors.muted} style={{ textAlign: 'center' }}>
                Seluruh struk masuk bingkai: nama outlet, nomor struk, tanggal, dan total terlihat jelas.
              </Txt>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => pick('library')} hitSlop={8} style={{ alignSelf: 'center' }}>
              <Txt weight="semibold" size={14} color={colors.accentText}>
                Pilih dari galeri
              </Txt>
            </Pressable>
          </View>
        )}

        {error && <Banner tone="error" text={error} />}

        {photo && <Button title="Kirim struk" variant="brass" onPress={submit} loading={busy} />}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Hasil pemeriksaan: sedang dibaca, poin masuk, perlu foto ulang, atau dicek petugas. */
function ReceiptResult({ claim, onRetake }: { claim: ReceiptClaim; onRetake: () => void }) {
  const approved = claim.status === 'approved';
  const rejected = claim.status === 'rejected';

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
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.done} accessibilityLiveRegion="polite">
        <View style={[styles.doneIcon, rejected ? styles.iconRejected : !approved ? styles.iconWaiting : null]}>
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
        </View>
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

const styles = StyleSheet.create({
  body: { padding: 16, paddingTop: 12, paddingBottom: 120, gap: 20 },
  capture: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  captureIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  preview: { height: 360, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  retake: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  doneIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E7F4EC', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  iconRejected: { backgroundColor: '#FBECE8' },
  iconWaiting: { backgroundColor: colors.accentSoft },
});
