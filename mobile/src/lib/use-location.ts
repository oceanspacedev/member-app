import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

type Coords = { lat: number; lng: number };

/**
 * - `undetermined`: belum pernah ditanya — izin diminta lewat tombol, tidak otomatis saat aplikasi dibuka
 * - `denied`: ditolak, masih bisa ditanya lagi · `blocked`: ditolak permanen, hanya bisa lewat Pengaturan
 * - `off`: izin ada tapi lokasi/GPS HP dimatikan · `unavailable`: posisi tidak didapat (timeout, di dalam gedung)
 */
export type LocationStatus = 'checking' | 'undetermined' | 'denied' | 'blocked' | 'off' | 'locating' | 'ready' | 'unavailable';

/** Keadaan yang menunggu tindakan member (tampilkan kartu izin lokasi). */
export const NEEDS_ACTION: LocationStatus[] = ['undetermined', 'denied', 'blocked', 'off'];

/**
 * Lokasi perangkat untuk mengurutkan outlet terdekat. Mengikuti pola izin Android/iOS: aplikasi hanya
 * memeriksa izin saat dibuka; dialog izin sistem baru muncul setelah member menekan "Izinkan lokasi".
 */
export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<LocationStatus>('checking');
  const statusRef = useRef<LocationStatus>('checking');

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const read = useCallback(async () => {
    const enabled = await Location.hasServicesEnabledAsync().catch(() => true);
    if (!enabled) {
      setStatus('off');
      return;
    }

    setStatus((s) => (s === 'ready' ? s : 'locating'));
    // Posisi terakhir dulu agar daftar cepat terurut, lalu posisi terkini.
    const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 }).catch(() => null);
    if (last) {
      setCoords({ lat: last.coords.latitude, lng: last.coords.longitude });
      setStatus('ready');
    }
    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: current.coords.latitude, lng: current.coords.longitude });
      setStatus('ready');
    } catch {
      // GPS lemah / timeout: daftar tetap tampil tanpa jarak.
      setStatus((s) => (s === 'ready' ? s : 'unavailable'));
    }
  }, []);

  /** Periksa izin tanpa memunculkan dialog. */
  const check = useCallback(async () => {
    const permission = await Location.getForegroundPermissionsAsync().catch(() => null);
    if (!permission) {
      setStatus('unavailable');
      return;
    }
    if (permission.granted) {
      await read();
      return;
    }
    setCoords(null);
    setStatus(!permission.canAskAgain ? 'blocked' : permission.status === 'undetermined' ? 'undetermined' : 'denied');
  }, [read]);

  /** Tombol pada kartu lokasi: minta izin, nyalakan GPS, atau buka Pengaturan sesuai keadaan. */
  const request = useCallback(async () => {
    const current = statusRef.current;

    if (current === 'blocked') {
      await Linking.openSettings().catch(() => undefined);
      return;
    }

    if (current === 'off') {
      if (Platform.OS === 'android') {
        // Dialog sistem Android "Nyalakan lokasi perangkat?".
        await Location.enableNetworkProviderAsync().catch(() => undefined);
        await check();
      } else {
        await Linking.openSettings().catch(() => undefined);
      }
      return;
    }

    // Dialog izin sistem: "Izinkan saat aplikasi digunakan / Hanya kali ini / Jangan izinkan".
    const permission = await Location.requestForegroundPermissionsAsync().catch(() => null);
    if (permission?.granted) {
      if (Platform.OS === 'android' && !(await Location.hasServicesEnabledAsync().catch(() => true))) {
        await Location.enableNetworkProviderAsync().catch(() => undefined);
      }
      await read();
      return;
    }
    setStatus(permission && !permission.canAskAgain ? 'blocked' : 'denied');
  }, [check, read]);

  // Diperiksa setiap layar tampil dan saat kembali dari Pengaturan HP — kecuali lokasi sudah didapat.
  useFocusEffect(
    useCallback(() => {
      if (statusRef.current !== 'ready' && statusRef.current !== 'locating') void check();
    }, [check]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && statusRef.current !== 'ready' && statusRef.current !== 'locating') void check();
    });
    return () => sub.remove();
  }, [check]);

  return {
    coords,
    status,
    loading: status === 'checking' || status === 'locating',
    denied: status === 'denied' || status === 'blocked',
    request,
    /** Tarik-untuk-muat-ulang: baca posisi lagi bila izin sudah ada. */
    locate: check,
  };
}

export type LocationState = ReturnType<typeof useLocation>;
