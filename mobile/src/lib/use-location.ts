import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

type Coords = { lat: number; lng: number };

async function readPosition(onUpdate: (c: Coords) => void): Promise<'granted' | 'denied'> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return 'denied';

  try {
    // Posisi terakhir dulu agar daftar cepat terurut, lalu posisi terkini.
    const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
    if (last) onUpdate({ lat: last.coords.latitude, lng: last.coords.longitude });

    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    onUpdate({ lat: current.coords.latitude, lng: current.coords.longitude });
  } catch {
    // GPS mati / timeout: tetap tampilkan daftar tanpa jarak
  }
  return 'granted';
}

/**
 * Lokasi perangkat untuk mengurutkan outlet terdekat.
 */
export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    readPosition((c) => !cancelled && setCoords(c)).then((result) => {
      if (cancelled) return;
      setDenied(result === 'denied');
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const locate = useCallback(() => {
    setLoading(true);
    setNonce((n) => n + 1);
  }, []);

  return { coords, denied, loading, locate };
}
