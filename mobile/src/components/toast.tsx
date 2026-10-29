import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

import { Icon } from './icon';
import { Txt } from './ui';

type Tone = 'success' | 'error' | 'info';
type Toast = { id: number; text: string; tone: Tone };

const TOAST_MS = 2600;

const ToastContext = createContext<{ show: (text: string, tone?: Tone, ms?: number) => void } | null>(null);

/**
 * Kabar singkat yang muncul di atas tab bar lalu hilang sendiri ("Kode disalin", "Voucher masuk ke Voucher Saya").
 * Untuk konfirmasi ringan; kesalahan yang perlu ditindaklanjuti tetap memakai Banner/ErrorState di layar.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pesan yang lebih panjang (mis. alasan struk ditolak) boleh tampil lebih lama.
  const show = useCallback((text: string, tone: Tone = 'info', ms = TOAST_MS) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), text, tone });
    AccessibilityInfo.announceForAccessibility(text);
    timer.current = setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          key={toast.id}
          entering={FadeInDown.duration(220)}
          exiting={FadeOutDown.duration(180)}
          pointerEvents="none"
          style={[styles.wrap, { bottom: insets.bottom + 84 }]}>
          <View style={styles.toast}>
            <Icon
              name={toast.tone === 'error' ? 'info' : 'check'}
              size={18}
              color={toast.tone === 'error' ? '#F28B6B' : toast.tone === 'success' ? '#5CD39A' : colors.accentOnDark}
              strokeWidth={2.4}
            />
            <Txt weight="semibold" size={13} color="#FFFFFF" style={{ flexShrink: 1 }}>
              {toast.text}
            </Txt>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam <ToastProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24, zIndex: 90 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 420,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primary,
    // Garis tipis agar tetap terlihat di layar berlatar gelap (mis. detail voucher).
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
  },
});
