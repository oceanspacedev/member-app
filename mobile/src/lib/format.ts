const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** 12450 → "12.450" */
export function number(n: number): string {
  const sign = n < 0 ? '−' : '';
  return sign + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function rupiah(n: number): string {
  return `Rp${number(n)}`;
}

/** 25000 → "Rp25rb", 1500000 → "Rp1,5jt" — untuk badge nilai voucher. */
export function rupiahShort(n: number): string {
  if (n >= 1_000_000) return `Rp${String(Math.round(n / 100_000) / 10).replace('.', ',')}jt`;
  if (n >= 1_000) return `Rp${number(Math.round(n / 1_000))}rb`;
  return rupiah(n);
}

/** Sisa hari sampai tanggal ISO (0 = hari ini). */
export function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) - 1);
}

/** "2026-10-08T..." → "8 Okt 2026" */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "1995-11-14" → "14 November 1995" */
export function longDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

/** "6281244710921" → "+62 812-4471-0921" */
export function phone(p: string | null): string {
  if (!p) return '-';
  const local = p.startsWith('62') ? p.slice(2) : p;
  return `+62 ${local.replace(/(\d{3})(\d{4})(\d+)/, '$1-$2-$3')}`;
}

export function initials(name: string | null | undefined): string {
  return (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 11) return 'Selamat pagi,';
  if (h < 15) return 'Selamat siang,';
  if (h < 18) return 'Selamat sore,';
  return 'Selamat malam,';
}

/** "22:00" → "22.00" (penulisan jam Indonesia). */
export function jam(time: string | null): string {
  return (time ?? '').replace(':', '.');
}
