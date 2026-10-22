import { useEffect, useId, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/constants/theme';

import { Icon } from './icon';
import { LogoGlyph } from './logo';
import { Txt } from './ui';

/*
 * Ilustrasi layar pengenalan, digambar dari bentuk dasar dengan bahasa visual yang sama dengan aplikasi
 * (kartu navy, aksen biru muda, kelopak logo). Semua dirancang di kanvas 300×300 lalu diskalakan oleh ArtFrame.
 * Teks di dalam ilustrasi tidak ikut membesar saat pengguna memperbesar huruf: ini gambar, bukan konten.
 */

const CANVAS = 300;
const PANEL = colors.primaryDark;
const PANEL_LINE = colors.primaryLine;

/** Menempatkan kanvas 300×300 di tengah kotak `size`, diskalakan, dan disembunyikan dari pembaca layar. */
export function ArtFrame({ size, children }: { size: number; children: ReactNode }) {
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View
        style={{
          position: 'absolute',
          width: CANVAS,
          height: CANVAS,
          left: (size - CANVAS) / 2,
          top: (size - CANVAS) / 2,
          transform: [{ scale: size / CANVAS }],
        }}>
        {children}
      </View>
    </View>
  );
}

/** Cahaya biru lembut di belakang ilustrasi. */
function Halo() {
  const id = `halo${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={CANVAS} height={CANVAS} viewBox={`0 0 ${CANVAS} ${CANVAS}`} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.accentOnDark} stopOpacity={0.3} />
          <Stop offset="0.55" stopColor={colors.accentOnDark} stopOpacity={0.09} />
          <Stop offset="1" stopColor={colors.accentOnDark} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={150} cy={150} r={150} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Mengambang naik-turun pelan agar ilustrasi terasa hidup; diam bila "kurangi gerakan" aktif. */
function Float({
  children,
  delay = 0,
  amplitude = 5,
  duration = 2300,
  rotate = '0deg',
  style,
}: {
  children: ReactNode;
  delay?: number;
  amplitude?: number;
  duration?: number;
  rotate?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const y = useSharedValue(-amplitude);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      y.set(0);
      return;
    }
    y.set(withDelay(delay, withRepeat(withTiming(amplitude, { duration, easing: Easing.inOut(Easing.sin) }), -1, true)));
  }, [reduceMotion, delay, amplitude, duration, y]);

  // Rotasi ikut di sini karena `transform` di style biasa akan tertimpa transform animasi.
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }, { rotate }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/* ------------------------------------------------------------------------------------------------
 * 1. Satu kartu untuk semua brand
 * ---------------------------------------------------------------------------------------------- */

function BrandChip({ label, dot, style, delay }: { label: string; dot: string; style: StyleProp<ViewStyle>; delay: number }) {
  return (
    <Float style={[styles.chipWrap, style]} delay={delay} amplitude={4}>
      <View style={styles.chip}>
        <View style={[styles.chipDot, { backgroundColor: dot }]} />
        <Txt weight="bold" size={11} color="#FFFFFF" allowFontScaling={false}>
          {label}
        </Txt>
      </View>
    </Float>
  );
}

export function MemberCardArt() {
  return (
    <View style={styles.canvas}>
      <Halo />

      <View style={[styles.card, styles.cardBack]} />
      <Float style={styles.cardWrap} rotate="-7deg" amplitude={3} duration={2800}>
        <View style={[styles.card, styles.cardFront]}>
          <View style={styles.watermark} pointerEvents="none">
            <LogoGlyph size={150} />
          </View>
          <View style={styles.cardRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <LogoGlyph size={20} />
              <Txt weight="bold" size={12} color="#FFFFFF" allowFontScaling={false}>
                Space Club
              </Txt>
            </View>
            <View style={styles.tier}>
              <Txt weight="extrabold" size={10} color={colors.accentInk} style={{ letterSpacing: 1 }} allowFontScaling={false}>
                GOLD
              </Txt>
            </View>
          </View>
          <View style={{ gap: 5 }}>
            <Txt weight="bold" size={10} color={colors.accentOnDark} style={{ letterSpacing: 3 }} allowFontScaling={false}>
              MEMBER CARD
            </Txt>
            <Txt weight="semibold" size={15} color="#FFFFFF" style={{ letterSpacing: 2 }} allowFontScaling={false}>
              8124 •••• 0921
            </Txt>
          </View>
        </View>
      </Float>

      <BrandChip label="Kuliner" dot={colors.accentOnDark} style={{ left: 6, top: 38 }} delay={0} />
      <BrandChip label="Fast Food" dot={colors.accentOnDark} style={{ right: 4, top: 22 }} delay={500} />
      <BrandChip label="Retail & Emas" dot="#FFFFFF" style={{ left: 18, bottom: 34 }} delay={900} />
      <BrandChip label="Sports" dot={colors.accentOnDark} style={{ right: 12, bottom: 48 }} delay={300} />
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * 2. Foto struk, poin masuk
 * ---------------------------------------------------------------------------------------------- */

const PAPER_W = 172;
const PAPER_H = 232;
const TEETH = 9;

// Kertas struk dengan tepi bawah bergerigi.
function paperPath() {
  const tooth = PAPER_W / TEETH;
  let d = `M0 0H${PAPER_W}V${PAPER_H - 10}`;
  for (let i = 0; i < TEETH; i++) d += `l${-tooth / 2} 10l${-tooth / 2} -10`;
  return `${d}Z`;
}

function ReceiptLine({ name, price }: { name: number; price: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View style={[styles.bar, { width: name }]} />
      <View style={[styles.bar, { width: price }]} />
    </View>
  );
}

export function ReceiptArt() {
  const scan = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      scan.set(0.45);
      return;
    }
    scan.set(withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [reduceMotion, scan]);

  const scanStyle = useAnimatedStyle(() => ({ transform: [{ translateY: 14 + scan.get() * 224 }] }));

  return (
    <View style={styles.canvas}>
      <Halo />

      {/* Bingkai pindai di sudut-sudut kertas. */}
      <Svg width={232} height={292} viewBox="0 0 232 292" style={styles.frame}>
        <G stroke={colors.accentOnDark} strokeWidth={4} strokeLinecap="round" fill="none">
          <Path d="M2 28V12A10 10 0 0 1 12 2H28" />
          <Path d="M204 2H220A10 10 0 0 1 230 12V28" />
          <Path d="M230 264V280A10 10 0 0 1 220 290H204" />
          <Path d="M28 290H12A10 10 0 0 1 2 280V264" />
        </G>
      </Svg>

      <View style={styles.paper}>
        <Svg width={PAPER_W} height={PAPER_H} viewBox={`0 0 ${PAPER_W} ${PAPER_H}`} style={StyleSheet.absoluteFill}>
          <Path d={paperPath()} fill="#FFFFFF" />
        </Svg>
        <View style={styles.paperBody}>
          <View style={{ alignItems: 'center', gap: 5 }}>
            <LogoGlyph size={20} />
            <Txt weight="extrabold" size={9} color={colors.ink} style={{ letterSpacing: 2.5 }} allowFontScaling={false}>
              SPACE CLUB
            </Txt>
          </View>
          <View style={styles.dash} />
          <View style={{ gap: 9 }}>
            <ReceiptLine name={74} price={30} />
            <ReceiptLine name={58} price={36} />
            <ReceiptLine name={86} price={28} />
            <ReceiptLine name={64} price={34} />
          </View>
          <View style={styles.dash} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Txt weight="bold" size={10} color={colors.muted} style={{ letterSpacing: 1 }} allowFontScaling={false}>
              TOTAL
            </Txt>
            <Txt weight="extrabold" size={15} color={colors.ink} allowFontScaling={false}>
              Rp125.000
            </Txt>
          </View>
        </View>
        <Animated.View style={[styles.scanLine, scanStyle]} pointerEvents="none" />
      </View>

      <Float style={styles.pointsWrap} rotate="-6deg" amplitude={4} delay={400}>
        <View style={styles.points}>
          <View style={styles.pointsCheck}>
            <Icon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Txt weight="extrabold" size={15} color={colors.accentInk} allowFontScaling={false}>
            +250 poin
          </Txt>
        </View>
      </Float>
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * 3. Tukar jadi voucher, naik level
 * ---------------------------------------------------------------------------------------------- */

const TICKET_W = 268;
const TICKET_H = 100;
const TICKET_SPLIT = 100;

// Tiket dengan lekukan setengah lingkaran di sambungan blok nilai dan keterangan (latar tembus pandang).
const TICKET_PATH = `M14 0H${TICKET_SPLIT - 8}A8 8 0 0 0 ${TICKET_SPLIT + 8} 0H${TICKET_W - 14}A14 14 0 0 1 ${TICKET_W} 14V${TICKET_H - 14}A14 14 0 0 1 ${TICKET_W - 14} ${TICKET_H}H${TICKET_SPLIT + 8}A8 8 0 0 0 ${TICKET_SPLIT - 8} ${TICKET_H}H14A14 14 0 0 1 0 ${TICKET_H - 14}V14A14 14 0 0 1 14 0Z`;

function Ticket() {
  const id = `ticket${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={TICKET_W} height={TICKET_H} viewBox={`0 0 ${TICKET_W} ${TICKET_H}`} style={StyleSheet.absoluteFill}>
      <Defs>
        <ClipPath id={id}>
          <Path d={TICKET_PATH} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`}>
        <Rect x={0} y={0} width={TICKET_SPLIT} height={TICKET_H} fill={colors.accent} />
        <Rect x={TICKET_SPLIT} y={0} width={TICKET_W - TICKET_SPLIT} height={TICKET_H} fill="#FFFFFF" />
      </G>
    </Svg>
  );
}

function TierNode({ label, state }: { label: string; state: 'done' | 'current' | 'next' }) {
  return (
    <View style={{ alignItems: 'center', gap: 6, width: 52 }}>
      <View style={[styles.node, state === 'current' && styles.nodeCurrent, state === 'done' && styles.nodeDone]}>
        {state === 'done' && <Icon name="check" size={9} color={colors.accentInk} strokeWidth={3.4} />}
        {state === 'current' && <Icon name="crown" size={11} color={colors.accentInk} strokeWidth={2.4} />}
      </View>
      <Txt weight="bold" size={9} color={state === 'next' ? colors.onPrimaryMuted : '#FFFFFF'} style={{ letterSpacing: 0.5 }} allowFontScaling={false}>
        {label}
      </Txt>
    </View>
  );
}

export function VoucherLevelArt() {
  return (
    <View style={styles.canvas}>
      <Halo />

      <Float style={styles.ticketWrap} rotate="-5deg" amplitude={3} duration={2600}>
        <View style={styles.ticket}>
          <Ticket />
          <View style={styles.ticketValue}>
            <Txt weight="extrabold" size={20} color={colors.accentInk} style={{ letterSpacing: -0.5 }} numberOfLines={1} allowFontScaling={false}>
              Rp50rb
            </Txt>
            <Txt weight="semibold" size={10} color={colors.accentInk} allowFontScaling={false}>
              potongan
            </Txt>
          </View>
          <View style={styles.ticketBody}>
            <Txt weight="extrabold" size={9} color={colors.muted} style={{ letterSpacing: 0.8 }} allowFontScaling={false}>
              SEMUA OUTLET
            </Txt>
            <Txt weight="bold" size={13} color={colors.ink} style={{ lineHeight: 17 }} allowFontScaling={false}>
              Voucher belanja Rp50.000
            </Txt>
            <Txt size={10} color={colors.muted} allowFontScaling={false}>
              Berlaku s.d. 31 Des 2026
            </Txt>
          </View>
        </View>
      </Float>

      <Float style={styles.tierWrap} rotate="3deg" amplitude={4} delay={500}>
        <View style={styles.tierCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Icon name="crown" size={15} color={colors.accentOnDark} strokeWidth={2} />
            <Txt weight="semibold" size={11} color="#FFFFFF" allowFontScaling={false}>
              Naik level, cashback makin besar
            </Txt>
          </View>
          <View style={styles.ladder}>
            <View style={styles.track} />
            <View style={styles.trackFill} />
            <View style={styles.nodes}>
              <TierNode label="SILVER" state="done" />
              <TierNode label="GOLD" state="current" />
              <TierNode label="PLATINUM" state="next" />
            </View>
          </View>
        </View>
      </Float>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { width: CANVAS, height: CANVAS },

  // Kartu member
  cardWrap: { position: 'absolute', left: 28, top: 70, width: 244, height: 154 },
  card: { width: 244, height: 154, borderRadius: 22, padding: 18, justifyContent: 'space-between', overflow: 'hidden' },
  cardFront: {
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: PANEL_LINE,
    boxShadow: '0 16px 32px rgba(0, 0, 0, 0.5)',
  },
  cardBack: { position: 'absolute', left: 36, top: 84, backgroundColor: colors.accent, opacity: 0.92, transform: [{ rotate: '6deg' }] },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  watermark: { position: 'absolute', right: -34, bottom: -42, opacity: 0.09 },
  tier: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.accent },
  chipWrap: { position: 'absolute' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(23, 47, 134, 0.96)',
    borderWidth: 1,
    borderColor: PANEL_LINE,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },

  // Struk
  frame: { position: 'absolute', left: 34, top: 4 },
  paper: {
    position: 'absolute',
    left: 64,
    top: 24,
    width: PAPER_W,
    height: PAPER_H,
    transform: [{ rotate: '3deg' }],
    boxShadow: '0 16px 30px rgba(0, 0, 0, 0.45)',
  },
  paperBody: { flex: 1, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 22, justifyContent: 'space-between' },
  dash: { height: 0, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.inputBorder },
  bar: { height: 7, borderRadius: 4, backgroundColor: colors.line },
  scanLine: {
    position: 'absolute',
    left: -14,
    right: -14,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
    boxShadow: '0 0 16px rgba(157, 188, 250, 0.95)',
  },
  pointsWrap: { position: 'absolute', right: 2, bottom: 6 },
  points: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
    paddingRight: 16,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    boxShadow: '0 10px 22px rgba(0, 0, 0, 0.45)',
  },
  pointsCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accentInk, alignItems: 'center', justifyContent: 'center' },

  // Voucher & level
  ticketWrap: { position: 'absolute', left: 14, top: 34 },
  ticket: { width: TICKET_W, height: TICKET_H, flexDirection: 'row', boxShadow: '0 14px 28px rgba(0, 0, 0, 0.45)' },
  ticketValue: { width: TICKET_SPLIT, paddingLeft: 14, paddingRight: 6, justifyContent: 'center', gap: 1 },
  ticketBody: { flex: 1, paddingLeft: 16, paddingRight: 12, justifyContent: 'center', gap: 4 },
  tierWrap: { position: 'absolute', left: 38, top: 168 },
  tierCard: {
    width: 240,
    padding: 14,
    gap: 16,
    borderRadius: 18,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: PANEL_LINE,
    boxShadow: '0 14px 28px rgba(0, 0, 0, 0.45)',
  },
  ladder: { height: 40, justifyContent: 'flex-start' },
  track: { position: 'absolute', left: 26, right: 26, top: 8, height: 3, borderRadius: 2, backgroundColor: PANEL_LINE },
  trackFill: { position: 'absolute', left: 26, width: 94, top: 8, height: 3, borderRadius: 2, backgroundColor: colors.accent },
  nodes: { flexDirection: 'row', justifyContent: 'space-between' },
  node: { width: 20, height: 20, borderRadius: 10, backgroundColor: PANEL, borderWidth: 2, borderColor: PANEL_LINE, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  nodeCurrent: { backgroundColor: colors.accent, borderColor: colors.accentSoft, width: 22, height: 22, borderRadius: 11, marginTop: -1 },
});
