import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { colors, fonts } from '@/constants/theme';

function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} color={color} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtle,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.line, backgroundColor: colors.surface },
        sceneStyle: { backgroundColor: colors.ground },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="promo" options={{ title: 'Promo', tabBarIcon: tabIcon('tag') }} />
      <Tabs.Screen
        name="qr"
        options={{
          title: 'QR Member',
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: 'QR Member',
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
              <Icon name="qr" size={26} color={focused ? colors.primaryDark : '#FFFFFF'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="outlets" options={{ title: 'Outlet', tabBarIcon: tabIcon('pin') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
