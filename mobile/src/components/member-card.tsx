import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, tierColors } from '@/constants/theme';
import { number, rupiah } from '@/lib/format';
import type { Loyalty, Tier, User } from '@/lib/types';

import { Icon } from './icon';
import { LogoGlyph } from './logo';
import { Txt } from './ui';

/** Kartu keanggotaan — diketuk untuk membuka QR member. */
export function MemberCard({ user, loyalty }: { user: User; loyalty: Loyalty | null }) {
  const balance = loyalty?.points_balance ?? user.points_balance;
  const tier = (loyalty?.tier_label ?? user.tier).toUpperCase();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Kartu member ${tier}, ${number(balance)} poin. Ketuk untuk menampilkan QR member.`}
      onPress={() => router.navigate('/qr')}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
      <View style={styles.watermark} pointerEvents="none">
        <LogoGlyph size={190} />
      </View>

      <View style={styles.row}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LogoGlyph size={20} />
          <Txt weight="semibold" size={13} color="#FFFFFF">
            Ocean Space
          </Txt>
        </View>
        <Txt weight="bold" size={12} color={colors.accent} style={{ letterSpacing: 2.5 }}>
          {tier}
        </Txt>
      </View>

      <View>
        <Txt size={12} color={colors.onPrimaryMuted}>
          Saldo poin
        </Txt>
        <Txt weight="extrabold" size={34} color="#FFFFFF" style={{ letterSpacing: -0.8 }}>
          {number(balance)}
        </Txt>
        {loyalty && (
          <Txt size={12} color={colors.onPrimaryMuted}>
            Setara {rupiah(loyalty.points_value)}
          </Txt>
        )}
      </View>

      <View style={styles.row}>
        <Txt weight="medium" size={13} color={colors.onPrimaryMuted} style={{ letterSpacing: 1.5 }}>
          {user.member_code_display}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="qr" size={16} color="#FFFFFF" strokeWidth={2} />
          <Txt weight="semibold" size={12} color="#FFFFFF">
            Tampilkan QR
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}

type TierStatus = 'current' | 'next' | 'reached' | 'locked';

/**
 * Kartu satu level keanggotaan (Silver/Gold/Platinum) — sekeluarga dengan kartu member,
 * dengan warna tier. Level aktif diberi bingkai emas; level berikutnya menampilkan sisa belanja.
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
          <Txt weight="semibold" size={11} color="#FFFFFF" style={{ opacity: 0.9 }}>
            Ocean Space
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
        <Txt size={12} color="#FFFFFF" style={{ opacity: 0.85 }}>
          {requirement}
        </Txt>
      </View>

      <View style={styles.perks}>
        {benefits.map((b) => (
          <View key={b} style={styles.perk}>
            <Icon name="check" size={13} color={colors.accent} strokeWidth={2.4} />
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
  card: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    aspectRatio: 1.62,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  watermark: { position: 'absolute', right: -40, bottom: -50, opacity: 0.08 },
  tierCard: { borderRadius: 18, padding: 16, gap: 14, overflow: 'hidden' },
  // Bingkai emas untuk level yang sedang dimiliki.
  tierCurrent: { borderWidth: 2, borderColor: colors.accent },
  tierWatermark: { position: 'absolute', right: -30, bottom: -40, opacity: 0.1 },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  perks: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  track: { height: 3, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent },
});
