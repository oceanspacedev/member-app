import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

const CONFIGURED_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8010/api/v1').replace(/\/$/, '');

/**
 * Di HP (Expo Go), "localhost" berarti HP itu sendiri. Selama pengembangan, ganti dengan IP laptop
 * yang menjalankan Metro (hostUri, mis. "192.168.0.101:8081") — tidak perlu mengedit .env tiap ganti Wi-Fi.
 */
function resolveBaseUrl(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (Platform.OS === 'web' || !host || !/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return CONFIGURED_URL;

  return CONFIGURED_URL.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/])/, `//${host}`);
}

const BASE_URL = resolveBaseUrl();

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }

  /** Pesan validasi pertama untuk sebuah field, bila ada. */
  field(name: string): string | undefined {
    return this.errors[name]?.[0];
  }

  /** Gagal karena koneksi (offline / server tidak menjawab), bukan karena server menolak. */
  get isNetwork(): boolean {
    return this.status === 0;
  }
}

// Tanpa batas waktu, request di sinyal lemah bisa menggantung selamanya (loading tak berujung).
const TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 60_000;

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | null | undefined>;
  timeoutMs?: number;
};

export async function api<T>(path: string, { method = 'GET', body, query, timeoutMs = TIMEOUT_MS }: Options = {}): Promise<T> {
  const params = Object.entries(query ?? {})
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

  // FormData (upload file) dikirim apa adanya agar boundary multipart diisi otomatis.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  // Batas waktu mencakup koneksi sampai isi respons selesai dibaca.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  let json: Record<string, unknown> & { errors?: Record<string, string[]>; message?: string };
  try {
    response = await fetch(`${BASE_URL}${path}${params ? `?${params}` : ''}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
    json = await response.json().catch(() => ({}));
  } catch {
    throw new ApiError(
      controller.signal.aborted
        ? 'Koneksi lambat, server tidak merespons.'
        : 'Tidak bisa terhubung ke server. Periksa koneksi internet kamu.',
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (response.status === 401 && authToken) {
      onUnauthorized?.();
    }
    const errors: Record<string, string[]> = json.errors ?? {};
    const first = Object.values(errors)[0]?.[0];
    throw new ApiError(first ?? json.message ?? 'Terjadi kesalahan. Coba lagi.', response.status, errors);
  }

  return json as T;
}

export type UploadFile = { uri: string; name: string; type: string };

/** Unggah satu file (multipart, default field "file"), opsional bersama isian teks lain. */
export async function upload<T>(
  path: string,
  file: UploadFile,
  { field = 'file', fields = {} }: { field?: string; fields?: Record<string, string> } = {},
): Promise<T> {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  if (Platform.OS === 'web') {
    // Di web, image picker memberi URI blob/data — ubah dulu menjadi Blob.
    const blob = await (await fetch(file.uri)).blob();
    form.append(field, blob, file.name);
  } else {
    // fetch global di Expo adalah expo/fetch, yang tidak mendukung bagian FormData gaya React Native
    // ({ uri, name, type } → "Unsupported FormDataPart implementation"). File dari expo-file-system
    // adalah Blob sungguhan sehingga isinya ikut terkirim.
    form.append(field, new File(file.uri), file.name);
  }
  return api<T>(path, { method: 'POST', body: form, timeoutMs: UPLOAD_TIMEOUT_MS });
}
