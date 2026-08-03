import { useEffect, useState, useCallback } from 'react';
import { get, patch } from '../../api/client.js';

function GuestRow({ guest, onSaved }) {
  const [table, setTable] = useState(guest.table ?? '');
  const [seat, setSeat] = useState(guest.seat ?? '');
  const [saving, setSaving] = useState(false);

  async function save(field, value) {
    setSaving(true);
    try {
      const updated = await patch(`/guests/${guest._id}`, { [field]: value });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <td>
        {guest.firstName} {guest.lastName}
      </td>
      <td className="muted col-email">{guest.email}</td>
      <td>
        <span className={`badge badge-${guest.rsvpStatus}`}>{guest.rsvpStatus}</span>
      </td>
      <td>
        <input
          className="cell-input"
          value={table}
          disabled={saving}
          onChange={(e) => setTable(e.target.value)}
          onBlur={() => table !== (guest.table ?? '') && save('table', table)}
        />
      </td>
      <td>
        <input
          className="cell-input"
          value={seat}
          disabled={saving}
          onChange={(e) => setSeat(e.target.value)}
          onBlur={() => seat !== (guest.seat ?? '') && save('seat', seat)}
        />
      </td>
      <td>{guest.checkedIn ? '✅ Checked in' : '—'}</td>
    </tr>
  );
}

export default function GuestsPage() {
  const [guests, setGuests] = useState([]);
  const [q, setQ] = useState('');
  const [rsvp, setRsvp] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (rsvp) params.rsvp = rsvp;
    const data = await get('/guests', params);
    setGuests(data);
    setLoading(false);
  }, [q, rsvp]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  function replaceGuest(updated) {
    setGuests((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
  }

  // Group by party so couples / plus-ones sit next to each other, which is
  // the main aid the seating screen gives the organizer.
  const sorted = [...guests].sort((a, b) => {
    const pa = a.partyId || `zzz-${a._id}`;
    const pb = b.partyId || `zzz-${b._id}`;
    return pa === pb ? a.firstName.localeCompare(b.firstName) : pa.localeCompare(pb);
  });

  return (
    <div className="stack">
      <h1>Guests &amp; seating</h1>
      <div className="toolbar">
        <input placeholder="Search name…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={rsvp} onChange={(e) => setRsvp(e.target.value)}>
          <option value="">All RSVPs</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="pending">Pending</option>
        </select>
        <span className="muted">{guests.length} guests</span>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>RSVP</th>
              <th>Table</th>
              <th>Seat</th>
              <th>Check-in</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((g) => (
              <GuestRow key={g._id} guest={g} onSaved={replaceGuest} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
