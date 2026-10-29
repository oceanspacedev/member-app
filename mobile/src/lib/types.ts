export type Role = 'member' | 'cashier' | 'admin';

export type User = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  member_code: string;
  member_code_display: string;
  role: Role;
  outlet_id: number | null;
  tier: string;
  points_balance: number;
  profile_complete: boolean;
};

export type Loyalty = {
  tier: string;
  tier_label: string;
  cashback_percent: number;
  points_balance: number;
  points_value: number;
  annual_spend: number;
  next_tier: string | null;
  next_tier_label: string | null;
  next_tier_spend: number | null;
  spend_to_next_tier: number;
  active_vouchers: number;
};

export type Tier = {
  key: string;
  label: string;
  min_annual_spend: number;
  cashback_percent: number;
  perks: string[];
};

export type Brand = {
  id: number;
  name: string;
  slug: string;
  category: string;
  category_label: string;
  legal_entity: string | null;
  color: string;
  logo_url: string | null;
  description: string | null;
  outlets_count?: number;
};

export type Outlet = {
  id: number;
  name: string;
  brand?: Brand;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
  phone: string | null;
  whatsapp: string | null;
  opening_hours: Record<string, string> | null;
  status: { open: boolean; opens_at: string | null; closes_at: string | null };
  maps_url: string | null;
  menu_url: string | null;
  photo_url: string | null;
};

export type PromoType = 'info' | 'claim' | 'sale';

/** available · claimed (batas per member tercapai) · pending (tagihan belum dibayar) · locked (tier belum cukup) · sold_out */
export type VoucherState = 'available' | 'claimed' | 'pending' | 'locked' | 'sold_out';

export type Promo = {
  id: number;
  type: PromoType;
  title: string;
  /** Kosong bila desain gambar promo sudah berisi teks — gambar tampil apa adanya. */
  highlight: string | null;
  highlight_caption: string | null;
  description: string | null;
  terms: string | null;
  image_url: string | null;
  is_universal: boolean;
  brand?: Brand | null;
  min_tier: string | null;
  min_tier_label: string | null;
  starts_at: string;
  ends_at: string;
  /** Hanya untuk promo klaim gratis / tukar poin. */
  voucher: {
    value: number;
    min_spend: number;
    price_points: number | null;
    /** Harga bayar online (Xendit). */
    price_rupiah: number | null;
    open_order_id: number | null;
    quota_left: number | null;
    valid_days: number | null;
    state: VoucherState;
  } | null;
};

export type Voucher = {
  id: number;
  code: string;
  title: string;
  source: 'claim' | 'purchase' | 'paid' | 'birthday';
  source_label: string;
  status: 'active' | 'used' | 'expired';
  value: number;
  min_spend: number;
  points_spent: number;
  paid_amount: number;
  brand: Brand | null;
  is_universal: boolean;
  /** Kode dibuat di POS outlet ini: hanya kasir outlet ini yang bisa memakainya (lewat mesin kasirnya). */
  pos_outlet?: { id: number; name: string } | null;
  terms: string | null;
  image_url: string | null;
  expires_at: string;
  used_at: string | null;
  used_outlet?: string | null;
  discount: number | null;
  created_at: string;
};

/** Pembelian voucher dengan uang. */
export type VoucherOrder = {
  id: number;
  reference: string;
  title: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired' | 'canceled';
  status_label: string;
  payment_url: string | null;
  expires_at: string;
  paid_at: string | null;
  voucher: Voucher | null;
};

export type PointTransaction = {
  id: number;
  type: 'earn' | 'redeem' | 'adjust' | 'voucher';
  amount: number;
  points: number;
  balance_after: number;
  reference: string | null;
  description: string | null;
  outlet: { id: number; name: string; brand: string | null; color: string | null; logo_url: string | null } | null;
  created_at: string;
};

/** Klaim poin dari foto struk (outlet dengan POS pihak ketiga), diperiksa otomatis oleh sistem. */
export type ReceiptClaim = {
  id: number;
  /** Dibaca dari struk; null selama belum terbaca. */
  outlet?: { id: number; name: string } | null;
  receipt_number: string | null;
  amount: number | null;
  purchased_at: string | null;
  status: 'pending' | 'approved' | 'rejected';
  status_label: string;
  /** Sistem masih membaca struk (biasanya beberapa detik). */
  checking: boolean;
  /** Sistem menyerahkan struk ke petugas; hasilnya dikirim lewat WhatsApp. */
  in_review: boolean;
  reject_reason: string | null;
  points?: number | null;
  created_at: string;
};

export type Paginated<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
};
