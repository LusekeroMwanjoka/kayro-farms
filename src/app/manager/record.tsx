import React from 'react';
import { ActionGrid, Screen, ScreenHeader } from '../../components/ui';
export default function Record() {
  return (
    <Screen>
      <ScreenHeader title="Record" subtitle="What would you like to record?" />
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
    </Screen>
  );
}
