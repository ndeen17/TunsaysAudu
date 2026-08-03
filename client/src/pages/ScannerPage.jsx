import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function ScannerPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const busyRef = useRef(false);

  const [result, setResult] = useState(null); // { status, guest, ... }
  const [lastToken, setLastToken] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [stats, setStats] = useState(null);
  const [manualQuery, setManualQuery] = useState('');
  const [manualResults, setManualResults] = useState([]);

  function refreshStats() {
    get('/guests/stats').then(setStats).catch(() => {});
  }

  useEffect(() => {
    refreshStats();
  }, []);

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (decoded) => {
        if (cancelled || busyRef.current || !decoded) return;
        busyRef.current = true;
        handleScan(decoded.getText());
      })
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch((err) => setCameraError(err.message));

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, []);

  async function handleScan(token) {
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

  function scanNext() {
    setResult(null);
    setLastToken(null);
    busyRef.current = false;
  }

  async function onManualSearch(q) {
    setManualQuery(q);
    if (!q) return setManualResults([]);
    const data = await get('/checkin/lookup', { q });
    setManualResults(data);
  }

  function pickManual(guest) {
    busyRef.current = true;
    setManualResults([]);
    setManualQuery('');
    handleScan(guest.qrToken);
  }

  async function onLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="scanner-screen">
      <div className="scanner-topbar">
        <span>{stats ? `${stats.checkedIn} / ${stats.totalYes} checked in` : '—'}</span>
        <div>
          <span className="muted">{user?.username}</span>
          <button className="link-button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>

      {!result && (
        <>
          <video ref={videoRef} className="scanner-video" muted playsInline />
          {cameraError && <p className="error-text">Camera unavailable: {cameraError}</p>}

          <div className="manual-fallback">
            <input
              placeholder="Or search guest by name…"
              value={manualQuery}
              onChange={(e) => onManualSearch(e.target.value)}
            />
            <ul className="result-list">
              {manualResults.map((g) => (
                <li key={g._id}>
                  <span>
                    {g.firstName} {g.lastName}
                  </span>
                  <button onClick={() => pickManual(g)}>Check in</button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {result && <ResultCard result={result} onOverride={handleOverride} onNext={scanNext} />}
    </div>
  );
}

function ResultCard({ result, onOverride, onNext }) {
  if (result.status === 'invalid') {
    return (
      <div className="result-card result-invalid">
        <h2>Invalid QR</h2>
        <p>This code doesn't match any guest.</p>
        <button onClick={onNext}>Scan next</button>
      </div>
    );
  }

  if (result.status === 'error') {
    return (
      <div className="result-card result-invalid">
        <h2>Error</h2>
        <p>{result.message}</p>
        <button onClick={onNext}>Try again</button>
      </div>
    );
  }

  const { guest } = result;

  if (result.status === 'duplicate') {
    return (
      <div className="result-card result-duplicate">
        <h2>Already checked in</h2>
        <p className="guest-name">
          {guest.firstName} {guest.lastName}
        </p>
        <p>
          Table {guest.table || '—'} · Seat {guest.seat || '—'}
        </p>
        <p className="muted">First checked in at {new Date(result.firstCheckedInAt).toLocaleTimeString()}</p>
        <button className="override-button" onClick={onOverride}>
          Check in anyway
        </button>
        <button onClick={onNext}>Scan next</button>
      </div>
    );
  }

  return (
    <div className="result-card result-success">
      <h2>{result.status === 'checked_in_override' ? 'Checked in (override)' : 'Checked in'}</h2>
      <p className="guest-name">
        {guest.firstName} {guest.lastName}
      </p>
      <p>
        Table {guest.table || '—'} · Seat {guest.seat || '—'}
      </p>
      <button onClick={onNext}>Scan next</button>
    </div>
  );
}
