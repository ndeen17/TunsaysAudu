import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { post } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import CheckinResultCard from '../components/CheckinResultCard.jsx';

// Landing page for QR codes opened via a phone's own camera app (rather
// than our in-browser scanner). The QR encodes a URL to this route with the
// guest's token; opening it here checks them in immediately — no separate
// scan step needed once the staff member is logged in.
export default function ScanTokenPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [result, setResult] = useState(null);

  useEffect(() => {
    post('/checkin/scan', { token })
      .then(setResult)
      .catch((err) => setResult({ status: 'error', message: err.message }));
  }, [token]);

  async function handleOverride() {
    const data = await post('/checkin/scan', { token, override: true });
    setResult(data);
  }

  async function onLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="scanner-screen">
      <div className="scanner-topbar">
        <span>Scanned invite</span>
        <div>
          <span className="muted">{user?.username}</span>
          <button className="link-button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>

      {!result && <p className="checkin-loading">Checking…</p>}

      {result && (
        <CheckinResultCard
          result={result}
          onOverride={handleOverride}
          onNext={() => navigate('/checkin')}
          nextLabel="Done"
        />
      )}
    </div>
  );
}
