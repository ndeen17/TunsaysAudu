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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    const data = await get('/guests', params);
    setGuests(data);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  function replaceGuest(updated) {
    setGuests((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
  }

  const sorted = [...guests].sort(
    (a, b) => a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName)
  );

  return (
    <div className="stack">
      <h1>Guests &amp; seating</h1>
      <div className="toolbar">
        <input placeholder="Search name…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="muted">{guests.length} guests</span>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="col-email">Email</th>
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
        </div>
      )}
    </div>
  );
}
