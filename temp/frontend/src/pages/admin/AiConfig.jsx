import React from 'react';
import AppLayout from '../../components/AppLayout';
import PageHead from '../../components/PageHead';

export default function AiConfig() {
  return (
    <AppLayout>
      <PageHead
        title="AI configuration"
        subtitle="Model, sampling and the scoring weights applied to every session."
      />
    </AppLayout>
  );
}
