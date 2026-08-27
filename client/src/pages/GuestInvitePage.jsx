import { useState } from 'react';
import { post } from '../api/client.js';

// Public, no-login page — a guest types their own name and gets back their
// invite (with their unique QR baked in) to view or download, instead of
// staff generating and sending it to each guest individually.
export default function GuestInvitePage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState(null);
  const [guestId, setGuestId] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setOptions(null);
    setBusy(true);
    try {
      const data = await post('/guest-access/find', { firstName, lastName });
      if (data.options) {
        setOptions(data.options);
      } else {
        setGuestId(data.guestId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setGuestId(null);
    setOptions(null);
    setError('');
    setFirstName('');
    setLastName('');
  }

  if (guestId) {
    return (
      <div className="auth-screen">
        <div className="auth-card invite-preview-card">
          <button type="button" className="link-button back-link" onClick={startOver}>
            ← Search again
          </button>
          <h1>Your invite</h1>
          <img className="invite-preview" src={`/api/guest-access/${guestId}/invite.png`} alt="Your wedding invite" />
          <a href={`/api/guest-access/${guestId}/invite.png?download=1`} download>
            <button type="button">Download invite</button>
          </a>
        </div>
      </div>
    );
  }

  if (options) {
    return (
      <div className="auth-screen">
        <div className="auth-card role-picker">
          <button type="button" className="link-button back-link" onClick={startOver}>
            ← Search again
          </button>
          <h1>Which invite is yours?</h1>
          <p className="muted">We found more than one guest with that name.</p>
          {options.map((o) => (
            <button key={o.guestId} type="button" className="role-choice" onClick={() => setGuestId(o.guestId)}>
              <span className="role-choice-label">{o.envelopeName}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Find your invite</h1>
        <p className="muted">Enter your name exactly as it was given on your RSVP.</p>
        <label>
          First name
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus required />
        </label>
        <label>
          Last name
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Searching…' : 'Find my invite'}
        </button>
      </form>
    </div>
  );
}
