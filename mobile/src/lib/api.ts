import Constants from 'expo-constants';
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
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | null | undefined>;
};

export async function api<T>(path: string, { method = 'GET', body, query }: Options = {}): Promise<T> {
  const params = Object.entries(query ?? {})
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

  // FormData (upload file) dikirim apa adanya agar boundary multipart diisi otomatis.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}${params ? `?${params}` : ''}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Tidak bisa terhubung ke server. Periksa koneksi internet kamu.', 0);
  }

  const json = await response.json().catch(() => ({}));

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

/** Unggah satu file (multipart, field "file"). */
export async function upload<T>(path: string, file: UploadFile): Promise<T> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // Di web, image picker memberi URI blob/data — ubah dulu menjadi Blob.
    const blob = await (await fetch(file.uri)).blob();
    form.append('file', blob, file.name);
  } else {
    form.append('file', file as unknown as Blob);
  }
  return api<T>(path, { method: 'POST', body: form });
}
