import { useState } from 'react';
import { post } from '../api/client.js';

// Mirrors server/src/services/inviteContent.js — fixed wording for this
// one-off wedding, kept in sync by hand rather than fetched, same as that
// file's own rationale for being plain config instead of a setting.
const WEDDING = {
  familiesLine: 'Together with their families',
  names: ['Tunrayo', 'Toby'],
  verse: '“So they are no longer two, but one flesh. Therefore what God has joined together, let no one separate.”',
  dayName: 'THURSDAY',
  monthDay: 'SEPTEMBER 10',
  year: '2026',
  location: 'ENGLAND',
};

// Public, no-login page — a guest types their own name and gets back their
// QR to view on screen or download, instead of staff generating and sending
// it to each guest individually. The on-screen view is built from real
// HTML/CSS (matching the rest of the site) rather than embedding the
// branded invite artwork as an image — that PNG is only ever produced when
// the guest explicitly asks to download it.
export default function GuestInvitePage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState(null);
  const [guest, setGuest] = useState(null); // { guestId, displayName }

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
        setGuest({ guestId: data.guestId, displayName: data.displayName });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setGuest(null);
    setOptions(null);
    setError('');
    setFirstName('');
    setLastName('');
  }

  if (guest) {
    return (
      <div className="auth-screen">
        <div className="guest-invite">
          <button type="button" className="link-button back-link" onClick={startOver}>
            ← Search again
          </button>
          <p className="guest-invite-eyebrow">{WEDDING.familiesLine}</p>
          <h1 className="guest-invite-names">
            {WEDDING.names[0]} <span className="amp">&amp;</span> {WEDDING.names[1]}
          </h1>
          <p className="guest-invite-verse">{WEDDING.verse}</p>
          <p className="guest-invite-date">
            {WEDDING.dayName} · <strong>{WEDDING.monthDay}</strong> · {WEDDING.year}
          </p>
          <p className="guest-invite-location">{WEDDING.location}</p>

          <div className="guest-invite-qr-box">
            <p className="guest-invite-guest-name">{guest.displayName}</p>
            <img src={`/api/guest-access/${guest.guestId}/qr.png`} alt="Your check-in QR code" />
            <p className="guest-invite-note">Show this QR code at the venue for entry</p>
          </div>

          <a href={`/api/guest-access/${guest.guestId}/invite.png?download=1`} download>
            <button type="button" className="secondary">
              Download invite card
            </button>
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
            <button key={o.guestId} type="button" className="role-choice" onClick={() => setGuest(o)}>
              <span className="role-choice-label">{o.displayName}</span>
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
