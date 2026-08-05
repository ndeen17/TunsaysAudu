import { useState } from 'react';
import { get, downloadFile } from '../../api/client.js';

export default function InvitesPage() {
  const [previewTick, setPreviewTick] = useState(0);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSearch(value) {
    setQ(value);
    if (!value) return setResults([]);
    const data = await get('/guests', { q: value });
    setResults(data);
  }

  async function generateOne(guest) {
    setError('');
    setBusyId(guest._id);
    try {
      await downloadFile(`/invites/${guest._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function generateAll() {
    setError('');
    setBatchBusy(true);
    try {
      await downloadFile('/invites/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBatchBusy(false);
    }
  }

  return (
    <div className="stack">
      <h1>Invites</h1>

      <div className="card invite-preview-card">
        <img
          key={previewTick}
          className="invite-preview"
          src={`/api/invites/preview?t=${previewTick}`}
          alt="Sample invite preview"
        />
        <button className="secondary" onClick={() => setPreviewTick((t) => t + 1)}>
          Refresh preview
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h2>Single invite</h2>
        <input placeholder="Search guest by name…" value={q} onChange={(e) => onSearch(e.target.value)} />
        <ul className="result-list">
          {results.map((g) => (
            <li key={g._id}>
              <span>
                {g.firstName} {g.lastName}
              </span>
              <button onClick={() => generateOne(g)} disabled={busyId === g._id}>
                {busyId === g._id ? 'Generating…' : 'Download invite'}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Batch</h2>
        <p className="muted">Generates an invite for every guest in the list and downloads a zip.</p>
        <button onClick={generateAll} disabled={batchBusy}>
          {batchBusy ? 'Generating all…' : 'Generate all guests'}
        </button>
      </div>
    </div>
  );
}
