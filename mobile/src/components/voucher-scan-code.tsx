import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Rect } from 'react-native-svg';

import { code128Widths } from '@/lib/code128';

const QUIET = 10; // modul kosong di kiri-kanan barcode, wajib agar scanner mengenali awal/akhir

/**
 * Kode voucher dalam dua bentuk mesin: QR (scanner 2D / kamera POS) dan barcode Code 128 (scanner laser 1D).
 * Isinya kode tanpa tanda hubung: scanner "mengetik" seperti keyboard dan simbol bisa salah ketik
 * bila layout keyboard POS berbeda, sedangkan huruf dan angka selalu aman.
 */
export function VoucherScanCode({ code }: { code: string }) {
  const raw = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const widths = code128Widths(raw);
  const modules = widths.reduce((a, b) => a + b, 0) + QUIET * 2;

  // Posisi tiap bar = quiet zone + jumlah lebar sebelumnya; indeks genap = bar hitam, ganjil = spasi.
  const starts = widths.map((_, i) => QUIET + widths.slice(0, i).reduce((a, b) => a + b, 0));
  const bars = widths.map((w, i) => (i % 2 === 0 ? <Rect key={i} x={starts[i]} y={0} width={w} height={1} fill="#000" /> : null));

  return (
    <View style={styles.wrap} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <QRCode value={raw} size={168} ecl="M" quietZone={8} />
      <Svg width="100%" height={64} viewBox={`0 0 ${modules} 1`} preserveAspectRatio="none">
        {bars}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // Selalu putih (juga di tema gelap): scanner butuh kontras hitam-di-atas-putih.
  wrap: { alignSelf: 'stretch', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 8 },
});
