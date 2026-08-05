import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const ROLE_INFO = {
  organizer: {
    label: 'Organizer',
    blurb: 'Generate invites, assign seating',
    heading: 'Organizer sign in',
  },
  security: {
    label: 'Security / Door Staff',
    blurb: 'Scan QR codes and check guests in',
    heading: 'Security sign in',
  },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(null); // null | 'organizer' | 'security'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const me = await login(username, password);
      const dest = location.state?.from || (me.role === 'security' ? '/scanner' : '/');
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function backToChoices() {
    setMode(null);
    setUsername('');
    setPassword('');
    setError('');
  }

  if (!mode) {
    return (
      <div className="auth-screen">
        <div className="auth-card role-picker">
          <h1>Wedding Invites</h1>
          <p className="muted">Who's signing in?</p>
          {Object.entries(ROLE_INFO).map(([key, info]) => (
            <button key={key} type="button" className="role-choice" onClick={() => setMode(key)}>
              <span className="role-choice-label">{info.label}</span>
              <span className="role-choice-blurb">{info.blurb}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <button type="button" className="link-button back-link" onClick={backToChoices}>
          ← Back
        </button>
        <h1>{ROLE_INFO[mode].heading}</h1>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : `Sign in as ${ROLE_INFO[mode].label}`}
        </button>
      </form>
    </div>
  );
}
