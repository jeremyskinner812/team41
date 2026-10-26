import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../api/client.js';

// Loads data on mount (and when `deps` change), optionally re-polling every `pollMs`.
// `loading` is only true until the first response; background polls keep showing the last good
// data, and a failed poll surfaces `error` without wiping what's on screen.
export function useApi(fetcher, { pollMs = 0, deps = [] } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const data = await fetcherRef.current();
      if (id === requestId.current) setState({ data, error: null, loading: false });
    } catch (err) {
      if (id === requestId.current) setState((s) => ({ ...s, error: errorMessage(err), loading: false }));
    }
  }, []);

  useEffect(() => {
    setState((s) => ({ ...s, loading: s.data === null }));
    load();
    if (!pollMs) return undefined;
    const timer = setInterval(load, pollMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass explicit deps
  }, [load, pollMs, ...deps]);

  return { ...state, reload: load };
}
