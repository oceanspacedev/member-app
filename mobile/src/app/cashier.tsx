import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner, Button, Card, Chip, Field, ScreenHeader, Txt } from '@/components/ui';
import { voucherPlace } from '@/components/voucher-card';
import { colors } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { number, rupiah } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Loyalty, PointTransaction, Voucher } from '@/lib/types';

type Member = { name: string | null; member_code: string };
type Scan = { member: Member; loyalty: Loyalty };
type Result = { transaction: PointTransaction; loyalty: Loyalty };
type VoucherScan = { voucher: Voucher; member: Member; usable: boolean; problem: string | null };
type VoucherResult = {
  voucher: Voucher;
  member: Member;
  discount: number;
  pay_amount: number;
  transaction: PointTransaction | null;
  loyalty: Loyalty;
};
type Mode = 'earn' | 'redeem';

/** QR member diawali "LC1."; selain itu voucher: QR lama "LCV1." atau kode yang diketik (ABCDE-FGHJK). */
const isVoucherQr = (payload: string) => !payload.startsWith('LC1.');

/**
 * Mode kasir: scan QR member (catat belanja / tukar poin) atau QR voucher (potong tagihan).
 * Fase 3 alur yang sama dipanggil langsung oleh sistem POS lewat /pos/*.
 */
export default function CashierScreen() {
  const { user } = useSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [qr, setQr] = useState<string | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [manual, setManual] = useState('');
  const [mode, setMode] = useState<Mode>('earn');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [voucherScan, setVoucherScan] = useState<VoucherScan | null>(null);
  const [voucherResult, setVoucherResult] = useState<VoucherResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scanLock = useRef(false);

  const isStaff = user?.role === 'cashier' || user?.role === 'admin';

  async function lookup(payload: string) {
    // Kamera memanggil onBarcodeScanned berkali-kali per detik; kunci agar hanya satu request.
    if (scanLock.current || qr) return;
    scanLock.current = true;
    setBusy(true);
    setError(null);
    try {
      if (isVoucherQr(payload)) {
        setVoucherScan(await api<VoucherScan>('/pos/vouchers/check', { method: 'POST', body: { qr: payload } }));
      } else {
        setScan(await api<Scan>('/pos/scan', { method: 'POST', body: { qr: payload } }));
      }
      setQr(payload);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'QR tidak bisa dibaca.');
      // Beri jeda sebelum kamera mencoba QR yang sama lagi.
      setTimeout(() => (scanLock.current = false), 2000);
      return;
    } finally {
      setBusy(false);
    }
    scanLock.current = false;
  }

  async function submit() {
    if (!qr) return;
    setBusy(true);
    setError(null);
    const value = Number(amount.replace(/\D/g, ''));
    try {
      const res = await api<Result>(`/pos/${mode}`, {
        method: 'POST',
        body: mode === 'earn' ? { qr, amount: value, reference: reference.trim() } : { qr, points: value, reference: reference.trim() },
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Transaksi gagal.');
    } finally {
      setBusy(false);
    }
  }

  async function submitVoucher() {
    if (!qr) return;
    setBusy(true);
    setError(null);
    try {
      setVoucherResult(
        await api<VoucherResult>('/pos/vouchers/redeem', {
          method: 'POST',
          body: { qr, amount: Number(amount.replace(/\D/g, '')), reference: reference.trim() },
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Voucher gagal dipakai.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setQr(null);
    setScan(null);
    setVoucherScan(null);
    setVoucherResult(null);
    setManual('');
    setAmount('');
    setReference('');
    setResult(null);
    setError(null);
  }

  if (!isStaff) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScreenHeader title="Mode Kasir" />
        <View style={{ padding: 16 }}>
          <Banner tone="error" text="Fitur ini hanya untuk akun kasir." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <ScreenHeader title="Mode Kasir" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {error && <Banner tone="error" text={error} />}

          {!scan && !voucherScan && (
            <>
              <Txt weight="extrabold" size={20} accessibilityRole="header">
                1. Scan QR member atau ketik kode voucher
              </Txt>
              {Platform.OS !== 'web' && permission?.granted ? (
                <View style={styles.camera}>
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={({ data }) => void lookup(data)}
                  />
                  <View style={styles.frame} pointerEvents="none" />
                </View>
              ) : Platform.OS !== 'web' ? (
                <Card style={{ gap: 12 }}>
                  <Txt size={14} style={{ lineHeight: 20 }}>
                    Izinkan akses kamera untuk memindai QR member.
                  </Txt>
                  <Button title="Izinkan kamera" onPress={requestPermission} />
                </Card>
              ) : null}

              <Field
                label="Kode voucher"
                value={manual}
                onChangeText={setManual}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="ABCDE-FGHJK"
              />
              <Button title="Cek kode" variant="secondary" onPress={() => lookup(manual.trim())} loading={busy} disabled={!manual.trim()} />
            </>
          )}

          {voucherScan && !voucherResult && (
            <>
              <Card style={{ gap: 6 }}>
                <Txt size={12} color={colors.muted}>
                  Voucher milik {voucherScan.member.name ?? voucherScan.member.member_code}
                </Txt>
                <Txt weight="extrabold" size={18}>
                  {voucherScan.voucher.title}
                </Txt>
                <Txt size={13} color={colors.inkSoft}>
                  Potongan {rupiah(voucherScan.voucher.value)}
                  {voucherScan.voucher.min_spend > 0 ? ` · min. belanja ${rupiah(voucherScan.voucher.min_spend)}` : ''} · {voucherPlace(voucherScan.voucher)}
                </Txt>
              </Card>

              {voucherScan.usable ? (
                <>
                  <Txt weight="extrabold" size={20} accessibilityRole="header">
                    2. Pakai voucher
                  </Txt>
                  <Field
                    label="Total belanja sebelum potongan (Rp)"
                    keyboardType="number-pad"
                    value={amount}
                    onChangeText={(t) => setAmount(t.replace(/\D/g, ''))}
                    hint={
                      amount ? (
                        <Txt size={12} color={colors.muted}>
                          Potongan {rupiah(Math.min(voucherScan.voucher.value, Number(amount)))} → member bayar{' '}
                          {rupiah(Math.max(0, Number(amount) - voucherScan.voucher.value))}
                        </Txt>
                      ) : null
                    }
                  />
                  <Field label="Nomor struk POS" value={reference} onChangeText={setReference} autoCapitalize="characters" placeholder="mis. INV-0012345" />
                  <Button title="Pakai voucher" onPress={submitVoucher} loading={busy} disabled={!amount || !reference.trim()} />
                </>
              ) : (
                <Banner tone="error" text={voucherScan.problem ?? 'Voucher tidak bisa dipakai.'} />
              )}
              <Button title="Batal, scan ulang" variant="secondary" onPress={reset} />
            </>
          )}

          {voucherResult && (
            <>
              <Banner
                icon="check"
                text={`Voucher terpakai. Potongan ${rupiah(voucherResult.discount)}, member bayar ${rupiah(voucherResult.pay_amount)}.`}
              />
              <Card style={{ gap: 4 }}>
                <Txt size={13} color={colors.muted}>
                  {voucherResult.member.name ?? voucherResult.member.member_code}
                </Txt>
                <Txt weight="extrabold" size={24}>
                  {voucherResult.transaction ? `+${number(voucherResult.transaction.points)} poin` : 'Tanpa poin'}
                </Txt>
                <Txt size={13} color={colors.inkSoft}>
                  Saldo sekarang {number(voucherResult.loyalty.points_balance)} poin · {voucherResult.loyalty.tier_label}
                </Txt>
              </Card>
              <Button title="Scan berikutnya" onPress={reset} />
            </>
          )}

          {scan && !result && (
            <>
              <Card style={{ gap: 6 }}>
                <Txt size={12} color={colors.muted}>
                  Member
                </Txt>
                <Txt weight="extrabold" size={18}>
                  {scan.member.name ?? scan.member.member_code}
                </Txt>
                <Txt size={13} color={colors.inkSoft}>
                  {scan.loyalty.tier_label} · cashback {scan.loyalty.cashback_percent}% · saldo {number(scan.loyalty.points_balance)} poin
                </Txt>
              </Card>

              <Txt weight="extrabold" size={20} accessibilityRole="header">
                2. Catat transaksi
              </Txt>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip label="Tambah poin (belanja)" active={mode === 'earn'} onPress={() => setMode('earn')} />
                <Chip label="Tukar poin" active={mode === 'redeem'} onPress={() => setMode('redeem')} />
              </View>

              <Field
                label={mode === 'earn' ? 'Total belanja (Rp)' : 'Jumlah poin ditukar'}
                keyboardType="number-pad"
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/\D/g, ''))}
                hint={
                  amount ? (
                    <Txt size={12} color={colors.muted}>
                      {mode === 'earn'
                        ? `${rupiah(Number(amount))} → ±${number(Math.floor((Number(amount) * scan.loyalty.cashback_percent) / 1000))} poin`
                        : `${number(Number(amount))} poin = potongan ${rupiah(Number(amount) * 10)}`}
                    </Txt>
                  ) : null
                }
              />
              <Field label="Nomor struk POS" value={reference} onChangeText={setReference} autoCapitalize="characters" placeholder="mis. INV-0012345" />

              <Button
                title={mode === 'earn' ? 'Tambahkan poin' : 'Tukar poin'}
                onPress={submit}
                loading={busy}
                disabled={!amount || !reference.trim()}
              />
              <Button title="Batal, scan ulang" variant="secondary" onPress={reset} />
            </>
          )}

          {result && (
            <>
              <Banner
                icon="check"
                text={
                  result.transaction.points >= 0
                    ? `Berhasil: +${number(result.transaction.points)} poin untuk belanja ${rupiah(result.transaction.amount)}.`
                    : `Berhasil: ${number(-result.transaction.points)} poin ditukar. Potong tagihan ${rupiah(result.transaction.amount)}.`
                }
              />
              <Card style={{ gap: 4 }}>
                <Txt size={13} color={colors.muted}>
                  Saldo member sekarang
                </Txt>
                <Txt weight="extrabold" size={24}>
                  {number(result.loyalty.points_balance)} poin
                </Txt>
                <Txt size={13} color={colors.inkSoft}>
                  Level {result.loyalty.tier_label}
                </Txt>
              </Card>
              <Button title="Scan member berikutnya" onPress={reset} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 14 },
  camera: { height: 320, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  frame: { width: 220, height: 220, borderRadius: 20, borderWidth: 3, borderColor: colors.accent },
});
