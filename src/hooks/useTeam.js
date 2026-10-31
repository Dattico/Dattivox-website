import { useState, useEffect } from 'react';

// The team is maintained on www.dattico.com (src/data/team.json in the
// dattico-website repo) and served from its /api/team route. Dattivox only
// displays it, so team changes never need a Dattivox deploy.
export const TEAM_URL = import.meta.env.VITE_TEAM_URL || 'https://www.dattico.com/api/team';
export const TEAM_PAGE_URL = 'https://www.dattico.com/team';

// status: 'loading' | 'ready' | 'error'
export const useTeam = () => {
  const [team, setTeam] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    fetch(TEAM_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Team feed returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) throw new Error('Team feed is empty');
        setTeam(data);
        setStatus('ready');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setStatus('error');
      });
    return () => controller.abort();
  }, []);

  return { team, status };
};
