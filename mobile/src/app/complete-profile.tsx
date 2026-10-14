import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Banner, Button, Field, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import type { User } from '@/lib/types';

const digitsOnly = (text: string, max: number) => text.replace(/\D/g, '').slice(0, max);

/** Pesan kesalahan bila tanggal tidak ada di kalender (mis. 31/02) atau di masa depan; undefined bila sah. */
function birthDateProblem(day: string, month: string, year: string): string | undefined {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const date = new Date(y, m - 1, d);
  const real = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  if (!real || y < 1900) return 'Tanggal lahir tidak valid. Periksa lagi tanggal, bulan, dan tahunnya.';
  if (date.getTime() > Date.now()) return 'Tanggal lahir tidak boleh di masa depan.';
  return undefined;
}

export default function CompleteProfileScreen() {
  const { user, setUser, refresh, signOut } = useSession();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [useLocation, setUseLocation] = useState(true);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const needsBirthDate = !user?.birth_date;
  const dayInput = useRef<TextInput>(null);
  const monthInput = useRef<TextInput>(null);
  const yearInput = useRef<TextInput>(null);
  const emailInput = useRef<TextInput>(null);

  const dateComplete = day.length > 0 && month.length > 0 && year.length === 4;
  // Pesan kesalahan lokal muncul begitu ketiga kolom terisi, tanpa menunggu server.
  const dateProblem = needsBirthDate && dateComplete ? birthDateProblem(day, month, year) : undefined;

  async function submit() {
    setErrors({});
    setLoading(true);
    try {
      const body: Record<string, unknown> = { name: name.trim(), email: email.trim() || null };
      if (needsBirthDate) body.birth_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      if (useLocation) {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.granted) {
          const pos = await Location.getLastKnownPositionAsync().catch(() => null);
          if (pos) {
            body.last_latitude = pos.coords.latitude;
            body.last_longitude = pos.coords.longitude;
          }
        }
      }

      const res = await api<{ data: User }>('/me', { method: 'PATCH', body });
      haptics.success();
      await refresh().catch(() => undefined);
      setUser(res.data);
    } catch (e) {
      haptics.error();
      if (e instanceof ApiError) {
        setErrors({
          name: e.field('name'),
          email: e.field('email'),
          birth_date: e.field('birth_date'),
          general: Object.keys(e.errors).length ? undefined : e.message,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const dateFilled = !needsBirthDate || (dateComplete && !dateProblem);
  const birthDateError = errors.birth_date ?? dateProblem;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View>
            <Txt weight="semibold" size={12} color={colors.muted}>
              Langkah terakhir
            </Txt>
            <Txt weight="extrabold" size={24} accessibilityRole="header">
              Lengkapi profil
            </Txt>
          </View>

          <Field
            label="Nama lengkap"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => (needsBirthDate ? dayInput : emailInput).current?.focus()}
            error={errors.name}
          />

          {needsBirthDate && (
            <View style={{ gap: 6 }}>
              <Txt weight="semibold" size={13} color={colors.inkSoft}>
                Tanggal lahir
              </Txt>
              {/* Kolom berpindah sendiri saat terisi penuh; Backspace di kolom kosong kembali ke kolom sebelumnya. */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Field
                    ref={dayInput}
                    label="Tanggal"
                    placeholder="DD"
                    keyboardType="number-pad"
                    maxLength={2}
                    value={day}
                    onChangeText={(text) => {
                      const v = digitsOnly(text, 2);
                      setDay(v);
                      if (v.length === 2) monthInput.current?.focus();
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    ref={monthInput}
                    label="Bulan"
                    placeholder="MM"
                    keyboardType="number-pad"
                    maxLength={2}
                    value={month}
                    onChangeText={(text) => {
                      const v = digitsOnly(text, 2);
                      setMonth(v);
                      if (v.length === 2) yearInput.current?.focus();
                    }}
                    onKeyPress={(e) => {
                      if (e.nativeEvent.key === 'Backspace' && month === '') dayInput.current?.focus();
                    }}
                  />
                </View>
                <View style={{ flex: 1.4 }}>
                  <Field
                    ref={yearInput}
                    label="Tahun"
                    placeholder="YYYY"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={year}
                    onChangeText={(text) => setYear(digitsOnly(text, 4))}
                    onKeyPress={(e) => {
                      if (e.nativeEvent.key === 'Backspace' && year === '') monthInput.current?.focus();
                    }}
                  />
                </View>
              </View>
              {birthDateError ? (
                <Txt size={12} color={colors.danger} accessibilityLiveRegion="polite">
                  {birthDateError}
                </Txt>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="gift" size={16} color={colors.accentText} strokeWidth={2} />
                  <Txt weight="semibold" size={12} color={colors.accentText}>
                    Dipakai untuk birthday reward. Tidak bisa diubah setelah disimpan.
                  </Txt>
                </View>
              )}
            </View>
          )}

          <Field
            ref={emailInput}
            label="Email (opsional)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="done"
            error={errors.email}
          />

          <Pressable
            style={styles.toggle}
            onPress={() => {
              haptics.select();
              setUseLocation((v) => !v);
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: useLocation }}>
            <View style={{ flex: 1 }}>
              <Txt weight="bold" size={13}>
                Izinkan akses lokasi
              </Txt>
              <Txt size={13} style={{ lineHeight: 19 }}>
                Untuk menampilkan outlet terdekat dan promo di sekitarmu.
              </Txt>
            </View>
            <Switch value={useLocation} onValueChange={setUseLocation} trackColor={{ false: colors.inputBorder, true: colors.primary }} thumbColor="#FFFFFF" />
          </Pressable>

          {errors.general && <Banner tone="error" text={errors.general} />}

          <Button title="Mulai jadi member" onPress={submit} loading={loading} disabled={!name.trim() || !dateFilled} />
          <Button title="Keluar" variant="secondary" onPress={signOut} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 24, gap: 18 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.primarySoft },
});
