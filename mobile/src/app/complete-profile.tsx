import * as Location from 'expo-location';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Banner, Button, Field, Txt } from '@/components/ui';
import { colors } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { User } from '@/lib/types';

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
      await refresh().catch(() => undefined);
      setUser(res.data);
    } catch (e) {
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

  const dateFilled = !needsBirthDate || (day && month && year.length === 4);

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

          <Field label="Nama lengkap" value={name} onChangeText={setName} autoComplete="name" textContentType="name" error={errors.name} />

          {needsBirthDate && (
          <View style={{ gap: 6 }}>
            <Txt weight="semibold" size={13} color={colors.inkSoft}>
              Tanggal lahir
            </Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label="Tanggal" placeholder="DD" keyboardType="number-pad" maxLength={2} value={day} onChangeText={setDay} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Bulan" placeholder="MM" keyboardType="number-pad" maxLength={2} value={month} onChangeText={setMonth} />
              </View>
              <View style={{ flex: 1.4 }}>
                <Field label="Tahun" placeholder="YYYY" keyboardType="number-pad" maxLength={4} value={year} onChangeText={setYear} />
              </View>
            </View>
            {errors.birth_date ? (
              <Txt size={12} color={colors.danger}>
                {errors.birth_date}
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
            label="Email (opsional)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />

          <Pressable style={styles.toggle} onPress={() => setUseLocation((v) => !v)} accessibilityRole="switch" accessibilityState={{ checked: useLocation }}>
            <View style={{ flex: 1 }}>
              <Txt weight="bold" size={13}>
                Izinkan akses lokasi
              </Txt>
              <Txt size={13} style={{ lineHeight: 19 }}>
                Untuk menampilkan outlet terdekat dan promo di sekitarmu.
              </Txt>
            </View>
            <Switch value={useLocation} onValueChange={setUseLocation} trackColor={{ true: colors.primary }} />
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
