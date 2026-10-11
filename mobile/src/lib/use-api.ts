import { useCallback, useEffect, useState } from 'react';

import { api, ApiError } from './api';

type State<T> = { key: string | null; data: T | null; error: string | null };

/**
 * Ambil data GET sederhana dengan status loading/error dan fungsi reload.
 * `path` null = jangan ambil dulu. Data lama tetap ditampilkan saat memuat ulang.
 */
export function useApi<T>(path: string | null, query?: Record<string, string | number | null | undefined>) {
  const queryKey = JSON.stringify(query ?? {});
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<State<T>>({ key: null, data: null, error: null });
  const requestKey = path === null ? null : `${path}?${queryKey}#${nonce}`;

  useEffect(() => {
    if (path === null || requestKey === null) return;
    let cancelled = false;

    api<T>(path, { query: JSON.parse(queryKey) }).then(
      (data) => {
        if (!cancelled) setState({ key: requestKey, data, error: null });
      },
      (e) => {
        if (!cancelled) {
          const error = e instanceof ApiError ? e.message : 'Terjadi kesalahan.';
          setState((prev) => ({ key: requestKey, data: prev.data, error }));
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [path, queryKey, requestKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    data: state.data,
    error: state.key === requestKey ? state.error : null,
    loading: requestKey !== null && state.key !== requestKey,
    reload,
  };
}
