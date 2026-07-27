import React from 'react';
import AppLayout from '../../components/AppLayout';
import PageHead from '../../components/PageHead';

export default function SystemActivity() {
  return (
    <AppLayout>
      <PageHead
        title="System activity"
        subtitle="Audit log of configuration changes, account actions and failures."
      />
    </AppLayout>
  );
}
