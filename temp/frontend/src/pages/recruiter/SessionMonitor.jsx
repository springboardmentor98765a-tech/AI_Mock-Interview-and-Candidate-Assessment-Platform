import React from 'react';
import AppLayout from '../../components/AppLayout';
import PageHead from '../../components/PageHead';

export default function SessionMonitor() {
  return (
    <AppLayout>
      <PageHead
        title="Monitor sessions"
        subtitle="Live, queued and awaiting-score interviews across your candidates."
      />
    </AppLayout>
  );
}
