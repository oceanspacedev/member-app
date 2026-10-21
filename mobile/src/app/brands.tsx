import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { BrandAvatar } from '@/components/media';
import { OutletListSkeleton } from '@/components/skeleton';
import { ErrorState } from '@/components/state';
import { ScreenHeader, Txt } from '@/components/ui';
import { categories, colors } from '@/constants/theme';
import type { Brand } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** Semua brand dalam grup, dikelompokkan per kategori seperti di dokumen rancangan. */
export default function BrandsScreen() {
  const { data, error, loading, reload } = useApi<{ data: Brand[] }>('/brands');
  const brands = data?.data ?? [];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScreenHeader title="Brand Grup" />
      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <OutletListSkeleton count={7} />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Txt size={14} color={colors.inkSoft} style={{ lineHeight: 21 }}>
            Satu kartu member untuk semua brand. Poin yang kamu kumpulkan di satu brand bisa ditukar di brand lain.
          </Txt>

          {categories.map((c) => {
            const group = brands.filter((b) => b.category === c.key);
            if (group.length === 0) return null;
            return (
              <View key={c.key} style={{ gap: 10 }}>
                <Txt weight="extrabold" size={13} color={colors.muted} style={{ letterSpacing: 0.6 }} accessibilityRole="header">
                  {c.label.toUpperCase()}
                </Txt>
                <View style={styles.group}>
                  {group.map((b, i) => (
                    <Pressable
                      key={b.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${b.name}, ${b.outlets_count ?? 0} outlet. Lihat outlet.`}
                      onPress={() => router.navigate({ pathname: '/outlets', params: { brand_id: String(b.id), brand: b.name } })}
                      style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { backgroundColor: colors.lineSoft }]}>
                      {b.logo_url ? (
                        <BrandAvatar name={b.name} logoUrl={b.logo_url} size={44} />
                      ) : (
                        <View style={styles.swatch}>
                          <Icon name="store" size={20} color={colors.accent} strokeWidth={1.8} />
                        </View>
                      )}
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt weight="bold" size={15}>
                          {b.name}
                        </Txt>
                        <Txt size={12} color={colors.muted} numberOfLines={1}>
                          {[b.outlets_count ? `${b.outlets_count} outlet` : null, b.legal_entity].filter(Boolean).join(' · ')}
                        </Txt>
                      </View>
                      <Icon name="chevron" size={18} color={colors.subtle} strokeWidth={2} />
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingTop: 4, paddingBottom: 48, gap: 22 },
  group: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  swatch: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
});
