import { useState } from 'react';
import { postForm, post } from '../../api/client.js';

export default function ImportPage() {
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setResult(null);
    setPreview(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await postForm('/import/preview', formData);
      setPreview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  async function onConfirm() {
    setBusy(true);
    setError('');
    try {
      const data = await post('/import/commit', { importId: preview.importId });
      setResult(data);
      setPreview(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <h1>Import guest list</h1>
      <p className="muted">
        Upload the RSVP export (.xlsx or .csv). New guests get a QR code automatically; re-uploading an updated
        export safely updates existing guests without touching QR codes already sent out.
      </p>

      <label className="file-input">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} disabled={busy} />
        Choose file
      </label>

      {error && <p className="error-text">{error}</p>}

      {preview && (
        <div className="card">
          <h2>Preview</h2>
          <ul className="summary-list">
            <li>
              <strong>{preview.summary.create}</strong> new guests
            </li>
            <li>
              <strong>{preview.summary.update}</strong> updated
            </li>
            <li>
              <strong>{preview.summary.unchanged}</strong> unchanged
            </li>
            <li>{preview.total} rows total</li>
          </ul>
          <button onClick={onConfirm} disabled={busy}>
            {busy ? 'Importing…' : 'Confirm import'}
          </button>
        </div>
      )}

      {result && (
        <div className="card success-card">
          Imported: {result.created} new, {result.updated} updated.
        </div>
      )}
    </div>
  );
}
