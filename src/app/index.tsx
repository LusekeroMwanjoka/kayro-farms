import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { colors } from '../theme';

export default function Index() {
  const { loading, session, profile } = useAuth();
  if (loading || (session && !profile)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mist }}>
        <ActivityIndicator color={colors.forest} size="large" />
      </View>
    );
  }
  if (!profile) return <Redirect href="/login" />;
  return <Redirect href={profile.role === 'admin' ? '/owner/overview' : '/manager/home'} />;
}
