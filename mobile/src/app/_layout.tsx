import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';

import { AppIntro } from '@/components/app-intro';
import { OfflineBanner } from '@/components/offline-banner';
import { ReceiptWatcher } from '@/components/receipt-watcher';
import { ToastProvider } from '@/components/toast';
import { colors } from '@/constants/theme';
import { IntroProvider } from '@/lib/intro';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);

  // Splash bawaan cukup sampai font siap; setelah itu layar pembuka (AppIntro) mengambil alih
  // dengan tampilan yang sama, lalu beranimasi sambil sesi login dimuat.
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  return (
    <SessionProvider>
      <ToastProvider>
        <IntroProvider value={introDone}>
          <StatusBar style="auto" />
          <RootNavigator fontsLoaded={fontsLoaded} />
          <OfflineBanner />
          <ReceiptWatcher />
        </IntroProvider>
        {fontsLoaded && !introDone && <Intro onDone={finishIntro} />}
      </ToastProvider>
    </SessionProvider>
  );
}

function Intro({ onDone }: { onDone: () => void }) {
  const { status } = useSession();
  return <AppIntro ready={status !== 'loading'} onDone={onDone} />;
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status, user, onboarded } = useSession();
  const ready = fontsLoaded && status !== 'loading';

  if (!ready) return null;

  const signedIn = status === 'signedIn';
  const guest = status === 'guest';
  const member = signedIn && !!user?.profile_complete;

  // Layar yang tidak lolos guard otomatis dialihkan ke layar pertama yang tersedia, jadi urutan penting:
  // pemasang baru mendarat di pengenalan, tamu & member di (tabs), sisanya di login.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
      {/* Pengenalan hanya untuk pembukaan pertama, sebelum memilih masuk atau tamu. */}
      <Stack.Protected guard={status === 'signedOut' && !onboarded}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: colors.primary } }} />
      </Stack.Protected>

      {/* Katalog publik: bisa dibuka tamu. */}
      <Stack.Protected guard={member || guest}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="outlet/[id]" />
        <Stack.Screen name="promos/[id]" />
        <Stack.Screen name="brands" />
        <Stack.Screen name="tiers" />
      </Stack.Protected>

      <Stack.Protected guard={member}>
        <Stack.Screen name="account" />
        <Stack.Screen name="points" />
        <Stack.Screen name="cashier" />
        <Stack.Screen name="vouchers" />
        <Stack.Screen name="voucher/[id]" />
      </Stack.Protected>

      {/* Tamu juga boleh membuka login (dari tombol "Masuk") lalu kembali menjelajah. */}
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="otp" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !member}>
        <Stack.Screen name="complete-profile" />
      </Stack.Protected>
    </Stack>
  );
}
