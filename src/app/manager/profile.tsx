import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Body, Button, InfoCard, Screen, ScreenHeader } from '../../components/ui';

export default function ManagerProfile() {
  const { profile, productCount, signOut } = useAuth();
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader title="Profile" />
      <InfoCard title="Connected to Supabase">
        <Body>Name: {profile?.full_name || '(no name set)'}</Body>
        <Body>Role from server: {profile?.role}</Body>
        <Body>Products visible: {productCount ?? '...'}</Body>
      </InfoCard>
      {profile?.role === 'admin' ? (
        <Button title="Back to owner view" variant="outline" onPress={() => router.replace('/owner/overview')} />
      ) : null}
      <Button title="Sign out" variant="outline" onPress={signOut} />
    </Screen>
  );
}
