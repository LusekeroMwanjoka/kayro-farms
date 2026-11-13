import React from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { ActionGrid, InfoCard, Body, KpiRow, Screen, ScreenHeader, greeting, todayLabel } from '../../components/ui';

export default function ManagerHome() {
  const { profile } = useAuth();
  const first = profile?.full_name?.split(' ')[0] ?? '';
  return (
    <Screen>
      <ScreenHeader title={`${greeting()}${first ? ', ' + first : ''}`} subtitle={todayLabel()} />
      <KpiRow
        items={[
          { label: "Today's sales", value: 'MWK 0' },
          { label: 'Collected', value: 'MWK 0' },
          { label: 'Expenses', value: 'MWK 0' },
        ]}
      />
      <ActionGrid
        items={[
          { icon: 'package-variant', label: 'Receive Stock' },
          { icon: 'cash-register', label: 'Record Sale' },
          { icon: 'cash', label: 'Collect Money' },
          { icon: 'clipboard-text', label: 'Log Activity' },
          { icon: 'receipt-text', label: 'Add Expense' },
          { icon: 'egg', label: 'Livestock' },
        ]}
      />
      <InfoCard title="Today">
        <Body>Nothing recorded yet. Entries will appear here once recording is built.</Body>
      </InfoCard>
    </Screen>
  );
}
