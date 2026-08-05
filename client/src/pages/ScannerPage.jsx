import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import CheckinResultCard from '../components/CheckinResultCard.jsx';

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

    function onDecoded(decoded) {
      if (cancelled || busyRef.current || !decoded) return;
      busyRef.current = true;
      handleScan(decoded.getText());
    }

    // Ask for the rear ("environment") camera explicitly — on phones,
    // letting the browser pick a default device often selects the
    // front-facing camera instead, which can't usefully see a QR code held
    // up in front of the guest. `ideal` (not `exact`) so it still falls
    // back gracefully on devices/laptops with only one camera.
    reader
      .decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, videoRef.current, onDecoded)
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch((err) => {
        // Some browsers/devices reject the facingMode constraint outright
        // rather than degrading gracefully — retry with no constraint.
        reader
          .decodeFromVideoDevice(undefined, videoRef.current, onDecoded)
          .then((controls) => {
            controlsRef.current = controls;
          })
          .catch((err2) => setCameraError(err2.message || err.message));
      });

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
        <span>{stats ? `${stats.checkedIn} / ${stats.total} checked in` : '—'}</span>
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
          {cameraError && (
            <p className="error-text">
              Camera unavailable: {cameraError}. Use search below, or scan the invite with your phone's own camera
              app instead — it'll open this app directly.
            </p>
          )}

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

      {result && <CheckinResultCard result={result} onOverride={handleOverride} onNext={scanNext} />}
    </div>
  );
}
