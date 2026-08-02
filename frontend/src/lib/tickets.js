/**
 * Report tickets, stored in localStorage so a ticket raised by a candidate or
 * recruiter really does show up in the admin queue when you switch roles.
 * Swap these four functions for API calls when the backend exists.
 */
const KEY = 'smarthire.tickets';

export const REASONS = [
  'Inappropriate behaviour',
  'Abusive language',
  'Spam or scam',
  'Fake profile',
  'Other',
];

export function listTickets() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(tickets) {
  localStorage.setItem(KEY, JSON.stringify(tickets));
}

export function createTicket({ fromName, fromRole, against, againstRole, reason, details }) {
  const ticket = {
    id: `T-${String(Date.now()).slice(-6)}`,
    fromName,
    fromRole,
    against,
    againstRole,
    reason,
    details,
    status: 'open',
    raised: new Date().toISOString().slice(0, 10),
  };
  save([ticket, ...listTickets()]);
  return ticket;
}

export function setTicketStatus(id, status) {
  const next = listTickets().map((t) => (t.id === id ? { ...t, status } : t));
  save(next);
  return next;
}
