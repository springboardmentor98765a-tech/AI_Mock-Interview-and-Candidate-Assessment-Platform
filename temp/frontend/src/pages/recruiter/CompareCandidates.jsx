import React from 'react';
import AppLayout from '../../components/AppLayout';
import PageHead from '../../components/PageHead';

export default function CompareCandidates() {
  return (
    <AppLayout>
      <PageHead
        title="Compare candidates"
        subtitle="Select candidates to place their scored categories side by side."
      />
    </AppLayout>
  );
}
