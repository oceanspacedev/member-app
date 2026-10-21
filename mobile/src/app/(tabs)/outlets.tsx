import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { LocationPrompt } from '@/components/location-prompt';
import { OutletRow, OutletSeparator } from '@/components/outlet-row';
import { OutletListSkeleton } from '@/components/skeleton';
import { EmptyState, ErrorState } from '@/components/state';
import { Chip, Txt } from '@/components/ui';
import { categories, colors, fonts } from '@/constants/theme';
import type { Outlet } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { NEEDS_ACTION, useLocation } from '@/lib/use-location';

export default function OutletsScreen() {
  // category: dari kategori · brand_id + brand: dari menu Brand Grup · cari: dari kolom cari di Beranda (fokuskan input)
  const params = useLocalSearchParams<{ category?: string; brand_id?: string; brand?: string; cari?: string }>();
  const [category, setCategory] = useState<string | null>(params.category ?? null);
  const [brand, setBrand] = useState<{ id: string; name: string } | null>(params.brand_id ? { id: params.brand_id, name: params.brand ?? 'Brand' } : null);
  const [seenParams, setSeenParams] = useState(params);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const location = useLocation();
  const input = useRef<TextInput>(null);

  // Parameter dari layar lain diterapkan setiap kali berubah.
  if (params.category !== seenParams.category || params.brand_id !== seenParams.brand_id) {
    setSeenParams(params);
    if (params.category) setCategory(params.category);
    setBrand(params.brand_id ? { id: params.brand_id, name: params.brand ?? 'Brand' } : null);
  }

  useEffect(() => {
    if (params.cari) input.current?.focus();
  }, [params.cari]);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  function clearFilters() {
    setSearch('');
    setQuery('');
    setCategory(null);
    setBrand(null);
    router.setParams({ brand_id: '', brand: '', category: '' });
  }

  const { data, error, loading, reload } = useApi<{ data: Outlet[] }>('/outlets', {
    category: brand ? null : category,
    brand_id: brand?.id,
    q: query,
    lat: location.coords?.lat,
    lng: location.coords?.lng,
  });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.header}>
        <Txt weight="extrabold" size={22} accessibilityRole="header">
          Outlet Terdekat
        </Txt>
        {NEEDS_ACTION.includes(location.status) ? (
          <LocationPrompt location={location} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="pin" size={14} color={colors.primary} strokeWidth={2.2} />
            <Txt size={12} color={colors.muted}>
              {location.coords ? 'Diurutkan dari lokasi GPS kamu' : location.loading ? 'Mencari lokasi…' : 'Lokasi belum ditemukan — tarik ke bawah untuk coba lagi'}
            </Txt>
          </View>
        )}
        <View style={styles.search}>
          <Icon name="search" size={20} color={colors.muted} strokeWidth={2} />
          <TextInput
            ref={input}
            value={search}
            onChangeText={setSearch}
            placeholder="Cari outlet, brand, atau kota"
            placeholderTextColor={colors.subtle}
            accessibilityLabel="Cari outlet"
            style={styles.searchInput}
          />
        </View>
        {brand ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Hapus filter brand ${brand.name}`}
            onPress={() => {
              setBrand(null);
              router.setParams({ brand_id: '', brand: '' });
            }}
            style={styles.filter}>
            <Txt weight="semibold" size={12} color={colors.accentText}>
              Brand: {brand.name}
            </Txt>
            <Txt weight="bold" size={14} color={colors.accentText}>
              ×
            </Txt>
          </Pressable>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip label="Semua" active={category === null} onPress={() => setCategory(null)} />
            {categories.map((c) => (
              <Chip key={c.key} label={c.short} active={category === c.key} onPress={() => setCategory(c.key)} />
            ))}
          </ScrollView>
        )}
      </View>

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <OutletListSkeleton />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 48 }}
          ItemSeparatorComponent={OutletSeparator}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => {
                location.locate();
                reload();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title="Outlet tidak ditemukan"
              text="Coba kata kunci lain, atau ubah kategori dan filter brand."
              action={search || category || brand ? { label: 'Hapus pencarian & filter', onPress: clearFilters } : undefined}
            />
          }
          renderItem={({ item }) => <OutletRow outlet={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 10 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  filter: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentLine,
  },
});
