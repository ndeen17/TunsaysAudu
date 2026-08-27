import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import CheckinResultCard from '../components/CheckinResultCard.jsx';

// Guests are checked in by scanning their invite QR — a third-party scanning
// app (or a phone's own camera) opens /scan/:token directly, so there's no
// in-app camera scanner here. This page covers everything else: a landing
// spot for staff who log in directly rather than via a scanned link, a live
// checked-in count, and a manual name search for guests whose QR can't be
// scanned.
export default function CheckInPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [lastToken, setLastToken] = useState(null);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  function refreshStats() {
    get('/guests/stats').then(setStats).catch(() => {});
  }

  useEffect(() => {
    refreshStats();
  }, []);

  async function handleCheckin(token) {
    setLastToken(token);
    try {
      const data = await post('/checkin/scan', { token });
      setResult(data);
      if (data.status !== 'invalid') refreshStats();
    } catch (err) {
      setResult({ status: 'error', message: err.message });
    }
  }

  async function handleOverride() {
    if (!lastToken) return;
    const data = await post('/checkin/scan', { token: lastToken, override: true });
    setResult(data);
    refreshStats();
  }

  function reset() {
    setResult(null);
    setLastToken(null);
  }

  async function onSearch(q) {
    setQuery(q);
    if (!q) return setResults([]);
    const data = await get('/checkin/lookup', { q });
    setResults(data);
  }

  function pick(guest) {
    setResults([]);
    setQuery('');
    handleCheckin(guest.qrToken);
  }

  async function onLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="scanner-screen">
      <div className="scanner-topbar">
        <span>{stats ? `${stats.checkedIn} / ${stats.total} checked in` : '—'}</span>
        <div>
          <span className="muted">{user?.username}</span>
          <button className="link-button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>

      {!result && (
        <div className="manual-fallback">
          <p className="muted">
            Guests are checked in by scanning their invite QR. Use this to check someone in manually by name instead.
          </p>
          <input placeholder="Search guest by name…" value={query} onChange={(e) => onSearch(e.target.value)} />
          <ul className="result-list">
            {results.map((g) => (
              <li key={g._id}>
                <span>
                  {g.firstName} {g.lastName}
                </span>
                <button onClick={() => pick(g)}>Check in</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && <CheckinResultCard result={result} onOverride={handleOverride} onNext={reset} />}
    </div>
  );
}
