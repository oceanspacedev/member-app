import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleLogo } from '@/components/icon';
import { LogoMark } from '@/components/logo';
import { Banner, Button, Field, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';

export default function LoginScreen() {
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
          <View style={styles.brand}>
            <LogoMark size={56} />
            <Txt weight="extrabold" size={22} accessibilityRole="header">
              Ocean Space
            </Txt>
          </View>

          <View style={styles.card}>
            <Txt weight="bold" size={20} style={{ textAlign: 'center' }} accessibilityRole="header">
              Masuk
            </Txt>

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

          <Txt size={12} color={colors.muted} style={styles.terms}>
            Dengan masuk, kamu menyetujui Syarat & Ketentuan dan Kebijakan Privasi Ocean Space.
          </Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ground },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, gap: 24 },
  brand: { alignItems: 'center', gap: 10 },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 24,
    gap: 18,
    boxShadow: '0 6px 24px rgba(24, 24, 27, 0.06)',
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
  terms: { textAlign: 'center', lineHeight: 18, maxWidth: 320, alignSelf: 'center' },
});
