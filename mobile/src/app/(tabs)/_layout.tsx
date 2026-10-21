import { router, Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { colors, fonts } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useSession } from '@/lib/session';

function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} color={color} />;
  };
}

export default function TabsLayout() {
  const { status } = useSession();

  return (
    <Tabs
      // Getar halus tiap ganti tab, seperti di aplikasi belanja besar.
      screenListeners={{ tabPress: () => haptics.select() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtle,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11 },
        tabBarAllowFontScaling: false,
        tabBarStyle: { borderTopColor: colors.line, backgroundColor: colors.surface },
        sceneStyle: { backgroundColor: colors.ground },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="promo" options={{ title: 'Promo', tabBarIcon: tabIcon('tag') }} />
      <Tabs.Screen
        name="struk"
        // Kirim struk butuh akun: tamu langsung dibawa ke layar login, tanpa halaman perantara.
        listeners={{
          tabPress: (e) => {
            if (status !== 'guest') return;
            e.preventDefault();
            router.push('/login');
          },
        }}
        options={{
          title: 'Foto Struk',
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: 'Foto struk untuk dapat poin',
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 60,
                height: 60,
                marginTop: -22,
                borderRadius: 30,
                borderWidth: 4,
                borderColor: focused ? colors.surface : colors.ground,
                backgroundColor: focused ? colors.accent : colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name="camera" size={26} color={colors.accentInk} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="outlets" options={{ title: 'Outlet', tabBarIcon: tabIcon('pin') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
