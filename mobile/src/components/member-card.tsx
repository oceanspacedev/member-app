import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, tierColors } from '@/constants/theme';
import { rupiah } from '@/lib/format';
import type { Loyalty, Tier } from '@/lib/types';

import { Icon } from './icon';
import { LogoGlyph } from './logo';
import { Txt } from './ui';

type TierStatus = 'current' | 'next' | 'reached' | 'locked';

/**
 * Kartu satu level keanggotaan (Silver/Gold/Platinum) dengan warna tier. Level aktif diberi bingkai biru; level berikutnya menampilkan sisa belanja.
 */
export function TierCard({ tier, status, remaining }: { tier: Tier; status: TierStatus; remaining?: number }) {
  const color = tierColors[tier.key] ?? colors.subtle;
  const requirement = tier.min_annual_spend === 0 ? 'Anggota baru' : `Belanja ≥ ${rupiah(tier.min_annual_spend)} / 12 bulan`;
  const benefits = [`Cashback poin ${tier.cashback_percent}%`, ...tier.perks];
  const badge =
    status === 'current' ? 'Level kamu' : status === 'next' && remaining ? `${rupiah(remaining)} lagi` : status === 'reached' ? 'Tercapai' : null;

  return (
    <View
      accessible
      accessibilityLabel={`${tier.label}. ${requirement}. ${benefits.join(', ')}.${badge ? ` ${badge}.` : ''}`}
      style={[styles.tierCard, { backgroundColor: color }, status === 'current' && styles.tierCurrent]}>
      <View style={styles.tierWatermark} pointerEvents="none">
        <LogoGlyph size={150} />
      </View>

      <View style={styles.row}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <LogoGlyph size={16} />
          <Txt weight="semibold" size={11} color="#FFFFFF">
            Space Club
          </Txt>
        </View>
        {badge && (
          <View style={[styles.tierBadge, status === 'current' ? { backgroundColor: colors.accent } : { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Txt weight="bold" size={11} color={status === 'current' ? colors.accentInk : '#FFFFFF'}>
              {badge}
            </Txt>
          </View>
        )}
      </View>

      <View style={{ gap: 4 }}>
        <Txt weight="extrabold" size={22} color="#FFFFFF" style={{ letterSpacing: 3 }}>
          {tier.label.toUpperCase()}
        </Txt>
        <Txt weight="medium" size={12} color="#FFFFFF">
          {requirement}
        </Txt>
      </View>

      <View style={styles.perks}>
        {benefits.map((b) => (
          <View key={b} style={styles.perk}>
            <Icon name="check" size={13} color={colors.accentOnDark} strokeWidth={2.4} />
            <Txt weight="semibold" size={12} color="#FFFFFF">
              {b}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Garis progres tipis ke tier berikutnya, di bawah kartu. */
export function TierProgress({ loyalty }: { loyalty: Loyalty }) {
  const progress = loyalty.next_tier_spend ? Math.min(1, loyalty.annual_spend / loyalty.next_tier_spend) : 1;

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(progress * 100, 2)}%` }]} />
      </View>
      <View style={styles.row}>
        <Txt size={12} color={colors.muted} style={{ flex: 1 }}>
          {loyalty.next_tier_label
            ? `${rupiah(loyalty.spend_to_next_tier)} lagi ke ${loyalty.next_tier_label}`
            : `Level tertinggi · cashback ${loyalty.cashback_percent}%`}
        </Txt>
        <Pressable onPress={() => router.push('/points')} accessibilityRole="link" hitSlop={10}>
          <Txt weight="semibold" size={12} color={colors.primary}>
            Riwayat poin
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tierCard: { borderRadius: 18, padding: 16, gap: 14, overflow: 'hidden' },
  // Bingkai biru untuk level yang sedang dimiliki.
  tierCurrent: { borderWidth: 2, borderColor: colors.accent },
  tierWatermark: { position: 'absolute', right: -30, bottom: -40, opacity: 0.1 },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  perks: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  track: { height: 3, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent },
});
