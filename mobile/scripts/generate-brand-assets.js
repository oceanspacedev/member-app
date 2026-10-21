#!/usr/bin/env node

/**
 * Membuat ulang semua aset logo dari satu definisi bentuk (empat kelopak biru muda & putih di latar sapphire),
 * persis sama dengan logo di aplikasi (src/components/logo.tsx). Tanpa dependensi:
 *
 *   npm run brand
 *
 * Hasil:
 * - ikon iOS 1024px TANPA alpha (App Store menolak ikon transparan) + varian dark & tinted iOS 18+
 * - adaptive icon Android: foreground muat di "safe zone" (66dp dari 108dp), monochrome untuk ikon bertema
 * - ikon Google Play 512px
 * - SVG merek di assets/brand
 * - favicon, favicon.svg, dan apple-touch-icon untuk landing page di ../backend/public
 *
 * Ganti warna/ukuran di bagian KONFIGURASI, jalankan ulang, lalu build ulang aplikasi.
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const BACKEND_PUBLIC = path.resolve(ROOT, '../backend/public');

// ---------------------------------------------------------------------------------------------
// KONFIGURASI
// ---------------------------------------------------------------------------------------------

const INK = '#1E40AF'; // latar merek (colors.primary, biru sapphire)
// Sama dengan logoPetals di constants/theme.ts: biru muda & putih.
const PETAL_SOFT = '#9DBCFA';
const PETAL_LIGHT = '#FFFFFF';
// Urutan searah jarum jam dari kiri-atas, sama dengan logo.tsx: dalam-terang-dalam-terang.
const PETAL_COLORS = [PETAL_SOFT, PETAL_LIGHT, PETAL_SOFT, PETAL_LIGHT];

// Lebar logo sebagai bagian dari sisi ikon.
const IOS_GLYPH = 0.55;
// Android memotong adaptive icon dengan mask (lingkaran/squircle). Ujung kelopak terjauh berjarak
// ±0,61 × lebar logo dari pusat; 0,44 menjaganya di dalam lingkaran aman 66dp dari kanvas 108dp
// dengan ruang bernapas, sehingga ukurannya terasa sepadan dengan ikon iOS.
const ANDROID_GLYPH = 0.44;
// Favicon: kotak hitam bersudut membulat (seperti LogoMark di aplikasi), logo sedikit lebih besar agar terbaca di 16px.
const FAVICON_GLYPH = 0.66;
const FAVICON_RADIUS = 0.22;

// ---------------------------------------------------------------------------------------------
// Bentuk logo (kotak 40): satu kelopak = lingkaran + sudut tajam di kanan-bawah, diputar 4×.
// ---------------------------------------------------------------------------------------------

const PETAL_PATH = 'M18.5 18.5H9.25A9.25 9.25 0 0 1 0 9.25A9.25 9.25 0 0 1 9.25 0A9.25 9.25 0 0 1 18.5 9.25Z';

function insideFirstPetal(x, y) {
  const dx = x - 9.25;
  const dy = y - 9.25;
  if (dx * dx + dy * dy <= 9.25 * 9.25) return true;
  return x >= 9.25 && x <= 18.5 && y >= 9.25 && y <= 18.5;
}

/** Kelopak ke-berapa (0–3) yang menutupi titik (u, v) di kotak 40, atau -1. */
function petalAt(u, v) {
  let x = u;
  let y = v;
  for (let k = 0; k < 4; k++) {
    if (insideFirstPetal(x, y)) return k;
    // Putar balik 90° terhadap pusat (20, 20) untuk menguji kelopak berikutnya.
    const nx = y;
    y = 40 - x;
    x = nx;
  }
  return -1;
}

// ---------------------------------------------------------------------------------------------
// Rasterisasi dengan supersampling (anti-alias) dan penulis PNG/ICO sederhana.
// ---------------------------------------------------------------------------------------------

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/**
 * @param {number} size sisi gambar (px)
 * @param {number} glyph lebar logo sebagai bagian dari sisi (0–1)
 * @param {{ background: string | null, colors: string[], rounded?: number }} style
 *   background null = hanya logo di atas transparan (RGBA); rounded > 0 = kotak bersudut membulat
 *   (jari-jari = rounded × sisi) berlatar `background`, di luarnya transparan (RGBA).
 */
function render(size, glyph, { background, colors, rounded = 0 }) {
  const bgColor = background === null ? [0, 0, 0] : hex(background);
  const withAlpha = background === null || rounded > 0;
  const channels = withAlpha ? 4 : 3;
  const data = Buffer.alloc(size * size * channels);
  const palette = colors.map(hex);
  const scale = (size * glyph) / 40;
  const radius = rounded * size;
  const SS = 4;
  const samples = SS * SS;

  const insideRounded = (x, y) => {
    const cx = Math.min(Math.max(x, radius), size - radius);
    const cy = Math.min(Math.max(y, radius), size - radius);
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius;
  };

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let petal = 0;
      let backing = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS;
          const y = py + (sy + 0.5) / SS;
          const k = petalAt((x - size / 2) / scale + 20, (y - size / 2) / scale + 20);
          if (k >= 0) {
            petal++;
            r += palette[k][0];
            g += palette[k][1];
            b += palette[k][2];
          } else if (rounded > 0 && insideRounded(x, y)) {
            backing++;
            r += bgColor[0];
            g += bgColor[1];
            b += bgColor[2];
          }
        }
      }

      const i = (py * size + px) * channels;
      if (withAlpha) {
        // Warna murni (tanpa pra-kali); kerapatan tepi lewat alpha.
        const covered = petal + backing;
        data[i] = covered ? Math.round(r / covered) : 0;
        data[i + 1] = covered ? Math.round(g / covered) : 0;
        data[i + 2] = covered ? Math.round(b / covered) : 0;
        data[i + 3] = Math.round((covered / samples) * 255);
      } else {
        const rest = samples - petal;
        data[i] = Math.round((r + bgColor[0] * rest) / samples);
        data[i + 1] = Math.round((g + bgColor[1] * rest) / samples);
        data[i + 2] = Math.round((b + bgColor[2] * rest) / samples);
      }
    }
  }
  return { size, channels, data };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}

function encodePng({ size, channels, data }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 8 bit per kanal
  header[9] = channels === 4 ? 6 : 2; // RGBA / RGB (tanpa alpha)

  const stride = size * channels;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('sRGB', Buffer.from([0])),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Berkas .ico berisi gambar PNG (didukung semua browser modern). */
function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // tipe: ikon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry.writeUInt16LE(1, 4); // bidang warna
    entry.writeUInt16LE(32, 6); // bit per piksel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]);
}

function writeFile(file, contents, label) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
  console.log(label);
}

function write(file, image) {
  writeFile(file, encodePng(image), `${path.relative(ROOT, file)}  ${image.size}×${image.size}  ${image.channels === 4 ? 'RGBA' : 'RGB (tanpa alpha)'}`);
}

// ---------------------------------------------------------------------------------------------
// Hasil
// ---------------------------------------------------------------------------------------------

const at = (relative) => path.join(ROOT, relative);

// iOS: persegi penuh tanpa sudut membulat & tanpa piksel transparan; sistem yang membulatkan.
write(at('assets/images/icon.png'), render(1024, IOS_GLYPH, { background: INK, colors: PETAL_COLORS }));
// iOS 18+ gelap: latar sedikit lebih dalam, logo tetap.
write(at('assets/images/ios-dark.png'), render(1024, IOS_GLYPH, { background: '#0A1A4A', colors: PETAL_COLORS }));
// iOS 18+ tinted: abu-abu di atas hitam; sistem mewarnainya sesuai pilihan pengguna.
write(at('assets/images/ios-tinted.png'), render(1024, IOS_GLYPH, { background: '#000000', colors: ['#9A9A9A', '#F2F2F2', '#9A9A9A', '#F2F2F2'] }));

// Android: foreground transparan; latar memakai backgroundColor di app.json.
write(at('assets/images/android-icon-foreground.png'), render(1024, ANDROID_GLYPH, { background: null, colors: PETAL_COLORS }));
// Android 13+ ikon bertema: satu warna putih, sistem yang mewarnai.
write(at('assets/images/android-icon-monochrome.png'), render(1024, ANDROID_GLYPH, { background: null, colors: ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'] }));

// Google Play Console: ikon aplikasi 512px (Play yang membulatkan sudutnya).
write(at('store-assets/play-store-icon-512.png'), render(512, IOS_GLYPH, { background: INK, colors: PETAL_COLORS }));

// Landing page (backend): ikon layar utama iOS 180px (opaque) dan favicon.
write(path.join(BACKEND_PUBLIC, 'apple-touch-icon.png'), render(180, IOS_GLYPH, { background: INK, colors: PETAL_COLORS }));
const favicons = [16, 32, 48].map((size) => ({ size, png: encodePng(render(size, FAVICON_GLYPH, { background: INK, colors: PETAL_COLORS, rounded: FAVICON_RADIUS })) }));
writeFile(path.join(BACKEND_PUBLIC, 'favicon.ico'), encodeIco(favicons), 'backend/public/favicon.ico  16, 32, 48px');

// ---------------------------------------------------------------------------------------------
// SVG merek (untuk web, dokumen, dan desainer)
// ---------------------------------------------------------------------------------------------

const petalsSvg = PETAL_COLORS.map(
  (fill, i) => `<path fill="${fill}"${i ? ` transform="rotate(${i * 90} 20 20)"` : ''} d="${PETAL_PATH}"/>`,
).join('\n    ');

const glyphSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" role="img" aria-label="Ocean Space">
  <!-- Empat kelopak = empat lini bisnis grup (kuliner, fast food, retail & emas, sports) yang menyatu menjadi satu "club". -->
  <g>
    ${petalsSvg}
  </g>
</svg>
`;

const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Ocean Space">
  <rect width="48" height="48" rx="12" fill="${INK}"/>
  <g transform="translate(10 10) scale(0.7)">
    ${petalsSvg}
  </g>
</svg>
`;

writeFile(at('assets/brand/logo-glyph.svg'), glyphSvg, 'assets/brand/logo-glyph.svg');
writeFile(at('assets/brand/logo-mark.svg'), markSvg, 'assets/brand/logo-mark.svg');
writeFile(path.join(BACKEND_PUBLIC, 'favicon.svg'), markSvg, 'backend/public/favicon.svg');
