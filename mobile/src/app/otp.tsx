import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WhatsAppLogo } from '@/components/icon';
import { Banner, Button, ScreenHeader, Txt } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { phone as formatPhone } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { User } from '@/lib/types';

const LENGTH = 6;

export default function OtpScreen() {
  const params = useLocalSearchParams<{ phone: string; resendIn?: string }>();
  const { signIn } = useSession();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(Number(params.resendIn ?? 60));
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function verify(value = code) {
    if (value.length !== LENGTH) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ token: string; user: User }>('/auth/otp/verify', {
        method: 'POST',
        body: { phone: params.phone, code: value, device_name: `${Platform.OS}-app` },
      });
      // Navigasi berpindah otomatis lewat guard di root layout.
      await signIn(res.token, res.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Verifikasi gagal.');
      setCode('');
      setLoading(false);
    }
  }

  async function resend() {
    setError(null);
    setInfo(null);
    try {
      const res = await api<{ resend_in: number }>('/auth/otp/request', { method: 'POST', body: { phone: params.phone } });
      setResendIn(res.resend_in);
      setInfo('Kode baru sudah dikirim.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal mengirim ulang.');
    }
  }

  function onChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, LENGTH);
    setCode(digits);
    if (digits.length === LENGTH) void verify(digits);
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <ScreenHeader title="Verifikasi" />
      <View style={styles.body}>
        <Txt weight="extrabold" size={24} accessibilityRole="header">
          Masukkan kode OTP
        </Txt>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <WhatsAppLogo size={22} />
          <Txt size={14} color={colors.muted} style={{ lineHeight: 21, flex: 1 }}>
            Kode {LENGTH} digit dikirim via WhatsApp ke{' '}
            <Txt weight="bold" size={14}>
              {formatPhone(params.phone)}
            </Txt>
          </Txt>
        </View>

        <Pressable onPress={() => input.current?.focus()} style={styles.boxes} accessibilityLabel="Kolom kode OTP">
          {Array.from({ length: LENGTH }, (_, i) => (
            <View key={i} style={[styles.box, i === code.length && styles.boxActive]}>
              <Txt weight="bold" size={22}>
                {code[i] ?? ''}
              </Txt>
            </View>
          ))}
          <TextInput
            ref={input}
            value={code}
            onChangeText={onChange}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={LENGTH}
            autoFocus
            accessibilityLabel="Kode OTP"
            style={styles.hiddenInput}
          />
        </Pressable>

        {error && <Banner tone="error" text={error} />}
        {info && <Banner text={info} icon="check" />}

        {resendIn > 0 ? (
          <Txt size={13} color={colors.muted}>
            Tidak menerima kode?{' '}
            <Txt weight="bold" size={13}>
              Kirim ulang dalam 00:{String(resendIn).padStart(2, '0')}
            </Txt>
          </Txt>
        ) : (
          <Pressable onPress={resend} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
            <Txt weight="bold" size={14} color={colors.primary}>
              Kirim ulang kode
            </Txt>
          </Pressable>
        )}

        <Button title="Verifikasi" onPress={() => verify()} loading={loading} disabled={code.length !== LENGTH} style={{ marginTop: 'auto' }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 24, paddingBottom: 16, gap: 16 },
  boxes: { flexDirection: 'row', gap: 8 },
  box: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.primary },
  hiddenInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%', fontFamily: fonts.regular },
});
