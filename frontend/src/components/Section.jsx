import React from 'react';
import PageHead from './PageHead';

/**
 * One scroll target inside a role's single page. The id is what the topbar
 * nav scrolls to and what the URL hash points at.
 */
export default function Section({ id, title, subtitle, action, children }) {
  return (
    <section id={id} className="section">
      <PageHead title={title} subtitle={subtitle} action={action} />
      {children}
    </section>
  );
}
