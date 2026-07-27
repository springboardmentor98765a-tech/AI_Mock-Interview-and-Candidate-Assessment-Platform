import React from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import PageHead from '../../components/PageHead';

export default function ManageUsers() {
  return (
    <AppLayout>
      <PageHead
        title="Manage users"
        subtitle="VIEW accounts. Change a role or block an account."
        action={<Link to="/admin/recruiters/new" className="btn btn-primary">Add recruiter</Link>}
      />
    </AppLayout>
  );
}
