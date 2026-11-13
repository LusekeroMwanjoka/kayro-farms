import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Body, Button, InfoCard, Screen, ScreenHeader } from '../../components/ui';

export default function More() {
  const { profile, productCount, signOut } = useAuth();
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader title="More" />
      <InfoCard title="Connected to Supabase">
        <Body>Name: {profile?.full_name || '(no name set)'}</Body>
        <Body>Role from server: {profile?.role}</Body>
        <Body>Products visible: {productCount ?? '...'}</Body>
      </InfoCard>
      <Button title="Switch to Record mode" onPress={() => router.replace('/manager/home')} />
      <Button title="Sign out" variant="outline" onPress={signOut} />
    </Screen>
  );
}
