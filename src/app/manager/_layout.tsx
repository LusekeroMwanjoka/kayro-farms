import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import type { ColorValue } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme';

const icon = (name: React.ComponentProps<typeof MaterialCommunityIcons>['name']) =>
  ({ color, size }: { color: ColorValue; size: number }) => <MaterialCommunityIcons name={name} color={color as string} size={size} />;

export default function ManagerLayout() {
  const { profile } = useAuth();
  if (!profile) return <Redirect href="/login" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.white },
      }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('home-variant') }} />
      <Tabs.Screen name="stock" options={{ title: 'Stock', tabBarIcon: icon('warehouse') }} />
      <Tabs.Screen name="record" options={{ title: 'Record', tabBarIcon: icon('plus-circle') }} />
      <Tabs.Screen name="summary" options={{ title: 'Summary', tabBarIcon: icon('clipboard-check') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('account') }} />
    </Tabs>
  );
}
