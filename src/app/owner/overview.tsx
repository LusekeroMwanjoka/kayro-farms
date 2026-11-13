import React from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Body, InfoCard, KpiRow, Screen, ScreenHeader, greeting, todayLabel } from '../../components/ui';

export default function Overview() {
  const { profile } = useAuth();
  const first = profile?.full_name?.split(' ')[0] ?? '';
  return (
    <Screen>
      <ScreenHeader title={`${greeting()}${first ? ', ' + first : ''}`} subtitle={todayLabel()} />
      <KpiRow
        items={[
          { label: 'Sales today', value: 'MWK 0' },
          { label: 'Cash in hand', value: 'MWK 0' },
          { label: 'Owed to farm', value: 'MWK 0' },
        ]}
      />
      <InfoCard title="Farm overview">
        <Body>Daily totals, low stock alerts and unusual entries will appear here.</Body>
      </InfoCard>
    </Screen>
  );
}
