import React from 'react';
import { Panel } from './Panel';
import { api } from '../lib/api';
import { useApi } from '../lib/useApi';
import { RATING_TONE } from '../lib/scoring';

/**
 * Module 5: candidates ranked by their most recently completed interview.
 *
 * Shared between the recruiter and admin views — GET /analytics/leaderboard
 * is gated for both roles and returns exactly the same shape, so there is one
 * table rather than two copies that could drift.
 */
const shortTime = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

export default function Leaderboard() {
  const board = useApi(() => api.leaderboard());

  return (
    <div className="card">
      <h2>Leaderboard</h2>
      <p className="muted">
        Ranked by each candidate&apos;s most recently completed interview — current standing, not
        a lifetime average or a personal best. A candidate appears here only once an interview of
        theirs has actually been scored.
      </p>
      <Panel
        {...board}
        isEmpty={board.data?.length === 0}
        empty="No interview has been scored yet, so there is nothing to rank."
        onRetry={board.reload}
      >
        <div className="scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                <th className="num">Score</th>
                <th>Rating</th>
                <th>Interview</th>
                <th className="num">Completed</th>
              </tr>
            </thead>
            <tbody>
              {board.data?.map((row) => (
                <tr key={row.user_id}>
                  <td className="num">{row.rank}</td>
                  <td>
                    <strong>{row.name}</strong>
                    <small>{row.email}</small>
                  </td>
                  <td className="num mono">{row.score.toFixed(1)}</td>
                  <td>
                    <span className={`badge ${RATING_TONE[row.rating] ?? 'badge-muted'}`}>
                      {row.rating}
                    </span>
                  </td>
                  <td>
                    {row.interview_type} &middot; {row.domain} &middot;{' '}
                    {row.difficulty.toLowerCase()}
                  </td>
                  <td className="num">{shortTime(row.completed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
