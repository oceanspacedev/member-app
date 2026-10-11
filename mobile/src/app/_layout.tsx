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
import { colors } from '@/constants/theme';
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
      <StatusBar style="auto" />
      <RootNavigator fontsLoaded={fontsLoaded} />
      {fontsLoaded && !introDone && <Intro onDone={finishIntro} />}
    </SessionProvider>
  );
}

function Intro({ onDone }: { onDone: () => void }) {
  const { status } = useSession();
  return <AppIntro ready={status !== 'loading'} onDone={onDone} />;
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status, user } = useSession();
  const ready = fontsLoaded && status !== 'loading';

  if (!ready) return null;

  const signedIn = status === 'signedIn';
  const profileComplete = !!user?.profile_complete;

  // Layar yang tidak lolos guard otomatis dialihkan ke layar pertama yang tersedia.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="otp" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !profileComplete}>
        <Stack.Screen name="complete-profile" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && profileComplete}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="points" />
        <Stack.Screen name="outlet/[id]" />
        <Stack.Screen name="cashier" />
        <Stack.Screen name="vouchers" />
        <Stack.Screen name="brands" />
        <Stack.Screen name="tiers" />
        <Stack.Screen name="voucher/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
