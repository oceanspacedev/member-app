import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { shortDate } from '@/lib/format';
import type { Promo } from '@/lib/types';

import { Icon } from './icon';
import { Photo, Scrim } from './media';
import { Txt } from './ui';
import { VoucherAction } from './voucher-action';

function brandLabel(promo: Promo) {
  const where = promo.is_universal ? 'SEMUA OUTLET' : (promo.brand?.name ?? '').toUpperCase();
  return promo.min_tier_label ? `${where} · KHUSUS ${promo.min_tier_label.toUpperCase()}` : where;
}

/** Badge besar "20% diskon" — di atas foto atau di blok warna brand. */
function Highlight({ promo, size = 19 }: { promo: Promo; size?: number }) {
  // Promo tanpa teks besar: badge berisi ikon promo saja.
  if (!promo.highlight) {
    return (
      <View style={{ alignSelf: 'center' }}>
        <Icon name="ticket" size={30} color="#FFFFFF" strokeWidth={1.8} />
      </View>
    );
  }

  // Teks panjang seperti "Rp100rb" diperkecil agar tetap satu baris di badge 96px.
  const fontSize = promo.highlight.length > 6 ? size - 4 : size;

  return (
    <View style={{ gap: 2 }}>
      <Txt weight="extrabold" size={fontSize} color="#FFFFFF" style={{ letterSpacing: -0.4 }} numberOfLines={1}>
        {promo.highlight}
      </Txt>
      {promo.highlight_caption && (
        <Txt weight="semibold" size={11} color="#FFFFFF">
          {promo.highlight_caption}
        </Txt>
      )}
    </View>
  );
}

export function PromoCard({ promo, onChanged }: { promo: Promo; onChanged?: () => void }) {
  // Satu warna untuk semua promo agar tampilan seragam; identitas brand dari nama & logonya.
  const color = colors.primary;

  const body = (
    <View style={styles.body}>
      <Txt weight="extrabold" size={11} color={promo.min_tier_label ? colors.accentText : colors.muted} style={{ letterSpacing: 0.6 }}>
        {brandLabel(promo)}
      </Txt>
      <Txt weight="bold" size={14} style={{ lineHeight: 19 }}>
        {promo.title}
      </Txt>
      <Txt size={12} color={colors.muted}>
        Berlaku s.d. {shortDate(promo.ends_at)}
      </Txt>
    </View>
  );

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Buka detail promo"
        onPress={() => router.push({ pathname: '/promos/[id]', params: { id: String(promo.id) } })}>
        {promo.image_url ? (
          <>
            <View style={styles.photo}>
              <Photo uri={promo.image_url} label={promo.title} tint={color} style={StyleSheet.absoluteFill} />
              {/* Tanpa teks besar, gambar (yang sudah berisi teks desain) tampil bersih tanpa bayangan. */}
              {promo.highlight ? (
                <>
                  <Scrim from={0} to={0.35} />
                  <View style={[styles.highlightChip, { backgroundColor: color }]}>
                    <Highlight promo={promo} size={18} />
                  </View>
                </>
              ) : null}
            </View>
            {body}
          </>
        ) : (
          <View style={styles.row}>
            <View style={[styles.badge, { backgroundColor: color }]}>
              <Highlight promo={promo} />
            </View>
            {body}
          </View>
        )}
      </Pressable>

      {promo.voucher && <VoucherAction promo={promo} onChanged={onChanged} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  badge: { width: 96, padding: 12, justifyContent: 'center' },
  body: { flex: 1, padding: 14, gap: 5 },
  photo: { width: '100%', aspectRatio: 16 / 9, justifyContent: 'flex-end', padding: 12 },
  highlightChip: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
});
