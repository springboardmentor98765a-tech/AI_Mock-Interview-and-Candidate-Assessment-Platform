import React from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import PageHead from '../../components/PageHead';

export default function InterviewHistory() {
  return (
    <AppLayout>
      <PageHead
        title="Interview history"
        subtitle="Sessions recorded. Reports are available once scoring completes."
        action={<Link to="/interview/setup" className="btn btn-primary">New session</Link>}
      />
    </AppLayout>
  );
}
