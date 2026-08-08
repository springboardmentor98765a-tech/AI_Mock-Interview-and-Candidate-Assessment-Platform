import { useCallback, useEffect, useState } from 'react';

/**
 * Fetch-on-mount with the three states every panel needs: loading, error, data.
 *
 * `deps` behaves like a useEffect dependency list. `reload()` re-runs the call,
 * which is what the mutating panels use after a successful write.
 */
export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.resolve()
      .then(fetcher)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          // A 404 from "you have nothing yet" endpoints is an empty state, not
          // a failure — let the caller decide by exposing the status.
          setError(err);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, error, loading, reload, setData };
}
