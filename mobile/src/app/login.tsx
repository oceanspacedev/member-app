import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleLogo } from '@/components/icon';
import { LogoMark } from '@/components/logo';
import { Banner, Button, Field, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';

export default function LoginScreen() {
  const { status, continueAsGuest } = useSession();
  // Tamu yang membuka login dari dalam aplikasi cukup kembali; yang baru pertama kali memilih mode tamu.
  const guest = status === 'guest';
  // Layar login tetap boleh dibuka tamu, jadi navigator tidak memindahkan otomatis:
  // setelah memilih mode tamu, pindah ke Beranda begitu statusnya berubah.
  const [choseGuest, setChoseGuest] = useState(false);
  useEffect(() => {
    if (choseGuest && guest) router.replace('/');
  }, [choseGuest, guest]);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestOtp() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await api<{ phone: string; resend_in: number }>('/auth/otp/request', {
        method: 'POST',
        body: { phone: `62${phone.replace(/\D/g, '').replace(/^0+/, '').replace(/^62/, '')}` },
      });
      router.push({ pathname: '/otp', params: { phone: res.phone, resendIn: String(res.resend_in) } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal mengirim OTP.');
    } finally {
      setLoading(false);
    }
  }

  // Login Google butuh development build + Client ID Google (tidak tersedia di Expo Go).
  // Backend /auth/google sudah siap; sambungkan @react-native-google-signin saat build rilis.
  function signInWithGoogle() {
    setError(null);
    setInfo('Masuk dengan Google segera hadir. Untuk sekarang, masuk dengan nomor WhatsApp.');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.brand}>
              <LogoMark size={52} />
              <Txt weight="extrabold" size={28} style={{ letterSpacing: -0.6, marginTop: 8 }} accessibilityRole="header">
                Masuk ke Ocean Space
              </Txt>
              <Txt size={14} color={colors.muted} style={{ lineHeight: 20 }}>
                Kumpulkan poin dan pakai voucher member di semua outlet.
              </Txt>
            </View>

            <Field
              label="Nomor WhatsApp"
              required
              prefix="+62"
              placeholder="812 3456 7890"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              value={phone}
              onChangeText={setPhone}
              onSubmitEditing={requestOtp}
              returnKeyType="send"
              hint={
                <Txt size={12} color={colors.muted}>
                  Kode OTP akan dikirim ke WhatsApp nomor ini.
                </Txt>
              }
            />

            {error && <Banner tone="error" text={error} />}

            <Button
              title="Kirim kode OTP"
              variant="brass"
              onPress={requestOtp}
              loading={loading}
              disabled={phone.replace(/\D/g, '').length < 9}
            />

            <View style={styles.divider} accessibilityRole="text">
              <View style={styles.line} />
              <Txt weight="bold" size={12} color={colors.subtle} style={{ letterSpacing: 1 }}>
                ATAU MASUK DENGAN
              </Txt>
              <View style={styles.line} />
            </View>

            <Button title="Google" variant="secondary" leading={<GoogleLogo size={22} />} onPress={signInWithGoogle} />
            {info && <Banner text={info} />}
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (guest) return router.canGoBack() ? router.back() : router.replace('/');
                setChoseGuest(true);
                void continueAsGuest();
              }}
              hitSlop={8}
              style={({ pressed }) => [styles.guest, pressed && { opacity: 0.6 }]}>
              <Txt weight="bold" size={15} color={colors.ink}>
                {guest ? 'Nanti saja, lanjut jelajahi' : 'Masuk sebagai tamu'}
              </Txt>
            </Pressable>

            <Txt size={12} color={colors.muted} style={styles.terms}>
              Dengan masuk, kamu menyetujui Syarat & Ketentuan dan Kebijakan Privasi Ocean Space.
            </Txt>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 24, gap: 32, width: '100%', maxWidth: 480, alignSelf: 'center' },
  content: { gap: 18 },
  brand: { gap: 6, marginBottom: 10 },
  // Tombol tamu & syarat menempel di bawah layar.
  footer: { marginTop: 'auto', gap: 20 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
  guest: { alignItems: 'center', alignSelf: 'center', paddingHorizontal: 12 },
  terms: { textAlign: 'center', lineHeight: 18, maxWidth: 320, alignSelf: 'center' },
});
