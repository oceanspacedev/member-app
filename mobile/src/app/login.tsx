import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WhatsAppLogo } from '@/components/icon';
import { LogoMark } from '@/components/logo';
import { Banner, Button, Field, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { legalUrls, openWebPage } from '@/lib/links';
import { useSession } from '@/lib/session';

/** "0812-3456-7890" / "+62 812 3456 7890" → "812 3456 7890": nomor lokal tanpa 0/62 di depan, dikelompokkan agar mudah dicek. */
function formatLocalPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '').replace(/^62/, '').slice(0, 13);
  return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7)].filter(Boolean).join(' ');
}

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
  const [loading, setLoading] = useState(false);
  const digits = phone.replace(/\D/g, '');

  async function requestOtp() {
    if (digits.length < 9 || loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ phone: string; resend_in: number }>('/auth/otp/request', {
        method: 'POST',
        body: { phone: `62${digits}` },
      });
      router.push({ pathname: '/otp', params: { phone: res.phone, resendIn: String(res.resend_in) } });
    } catch (e) {
      haptics.error();
      setError(e instanceof ApiError ? e.message : 'Gagal mengirim OTP.');
    } finally {
      setLoading(false);
    }
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
                Kumpulkan poin dan pakai voucher member di semua outlet. Tanpa password, cukup kode dari WhatsApp.
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
              onChangeText={(text) => {
                setPhone(formatLocalPhone(text));
                if (error) setError(null);
              }}
              onSubmitEditing={requestOtp}
              returnKeyType="send"
              hint={
                <View style={styles.hint}>
                  <WhatsAppLogo size={14} />
                  <Txt size={12} color={colors.muted}>
                    Kode OTP akan dikirim ke WhatsApp nomor ini.
                  </Txt>
                </View>
              }
            />

            {error && <Banner tone="error" text={error} />}

            <Button title="Kirim kode OTP" variant="brass" onPress={requestOtp} loading={loading} disabled={digits.length < 9} />
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
              Dengan masuk, kamu menyetujui{' '}
              <Txt weight="bold" size={12} color={colors.ink} accessibilityRole="link" onPress={() => void openWebPage(legalUrls.terms)}>
                Syarat & Ketentuan
              </Txt>{' '}
              dan{' '}
              <Txt weight="bold" size={12} color={colors.ink} accessibilityRole="link" onPress={() => void openWebPage(legalUrls.privacy)}>
                Kebijakan Privasi
              </Txt>{' '}
              Ocean Space.
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
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // Tombol tamu & syarat menempel di bawah layar.
  footer: { marginTop: 'auto', gap: 20 },
  guest: { alignItems: 'center', alignSelf: 'center', paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  terms: { textAlign: 'center', lineHeight: 19, maxWidth: 320, alignSelf: 'center' },
});
