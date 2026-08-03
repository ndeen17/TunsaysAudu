import { useEffect, useRef, useState } from 'react';
import { get, put, postForm, downloadFile } from '../../api/client.js';

const DEFAULT_STYLE = { fontSize: 64, color: '#2a2420', letterSpacing: 2, uppercase: false };

function DesignEditor({ design, onChanged }) {
  const [mode, setMode] = useState('name'); // 'name' | 'qr'
  const [namePos, setNamePos] = useState(design.layout?.namePos ?? { x: 0, y: 0 });
  const [nameStyle, setNameStyle] = useState({ ...DEFAULT_STYLE, ...design.layout?.nameStyle });
  const [qrPos, setQrPos] = useState(design.layout?.qrPos ?? { x: 0, y: 0 });
  const [qrSize, setQrSize] = useState(design.layout?.qrSize ?? 220);
  const [saving, setSaving] = useState(false);
  const [previewTick, setPreviewTick] = useState(0);
  const imgRef = useRef(null);

  const bg = design.background;

  function onImageClick(e) {
    const rect = imgRef.current.getBoundingClientRect();
    const xFrac = (e.clientX - rect.left) / rect.width;
    const yFrac = (e.clientY - rect.top) / rect.height;
    const x = Math.round(xFrac * bg.width);
    const y = Math.round(yFrac * bg.height);
    if (mode === 'name') setNamePos({ x, y });
    else setQrPos({ x: x - qrSize / 2, y: y - qrSize / 2 });
  }

  async function save() {
    setSaving(true);
    try {
      const layout = await put('/invites/layout', { namePos, nameStyle, qrPos, qrSize });
      onChanged({ background: design.background, layout });
      setPreviewTick((t) => t + 1);
    } finally {
      setSaving(false);
    }
  }

  const nameLeftPct = (namePos.x / bg.width) * 100;
  const nameTopPct = (namePos.y / bg.height) * 100;
  const qrLeftPct = (qrPos.x / bg.width) * 100;
  const qrTopPct = (qrPos.y / bg.height) * 100;
  const qrWidthPct = (qrSize / bg.width) * 100;
  const qrHeightPct = (qrSize / bg.height) * 100;

  return (
    <div className="card">
      <h2>Design</h2>
      <div className="toolbar">
        <button className={mode === 'name' ? '' : 'secondary'} onClick={() => setMode('name')}>
          Click to place name
        </button>
        <button className={mode === 'qr' ? '' : 'secondary'} onClick={() => setMode('qr')}>
          Click to place QR
        </button>
      </div>

      <div className="design-canvas" style={{ aspectRatio: `${bg.width} / ${bg.height}` }}>
        <img
          ref={imgRef}
          src={`/api/invites/background?t=${design.background.updatedAt}`}
          alt="Invite background"
          onClick={onImageClick}
        />
        <div className="design-marker name-marker" style={{ left: `${nameLeftPct}%`, top: `${nameTopPct}%` }}>
          Name
        </div>
        <div
          className="design-marker qr-marker"
          style={{ left: `${qrLeftPct}%`, top: `${qrTopPct}%`, width: `${qrWidthPct}%`, height: `${qrHeightPct}%` }}
        />
      </div>

      <div className="design-controls">
        <label>
          Font size
          <input
            type="number"
            value={nameStyle.fontSize}
            onChange={(e) => setNameStyle({ ...nameStyle, fontSize: Number(e.target.value) })}
          />
        </label>
        <label>
          Color
          <input type="color" value={nameStyle.color} onChange={(e) => setNameStyle({ ...nameStyle, color: e.target.value })} />
        </label>
        <label>
          Letter spacing
          <input
            type="number"
            value={nameStyle.letterSpacing}
            onChange={(e) => setNameStyle({ ...nameStyle, letterSpacing: Number(e.target.value) })}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={nameStyle.uppercase}
            onChange={(e) => setNameStyle({ ...nameStyle, uppercase: e.target.checked })}
          />
          Uppercase
        </label>
        <label>
          QR size
          <input type="number" value={qrSize} onChange={(e) => setQrSize(Number(e.target.value))} />
        </label>
      </div>

      <button onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save layout'}
      </button>

      <div>
        <h3>Preview (sample: "Jane Doe")</h3>
        <img className="design-preview" src={`/api/invites/preview?t=${previewTick}`} alt="Sample invite preview" />
      </div>
    </div>
  );
}

export default function InvitesPage() {
  const [design, setDesign] = useState(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  function loadDesign() {
    get('/invites/design').then(setDesign);
  }

  useEffect(loadDesign, []);

  async function onUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await postForm('/invites/background', formData);
      loadDesign();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  useEffect(() => {
    if (!q) return setResults([]);
    const timer = setTimeout(() => {
      get('/guests', { q }).then(setResults);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

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

  const ready = design && design.background && design.layout;

  return (
    <div className="stack">
      <h1>Generate invites</h1>

      <div className="card">
        <h2>Invite background</h2>
        <label className="file-input">
          <input type="file" accept="image/png,image/jpeg" onChange={onUpload} disabled={uploading} />
          {design?.background ? 'Replace image' : 'Upload image'}
        </label>
      </div>

      {design?.background && <DesignEditor design={design} onChanged={setDesign} />}

      {error && <p className="error-text">{error}</p>}

      {ready && (
        <>
          <div className="card">
            <h2>Single invite</h2>
            <input placeholder="Search guest by name…" value={q} onChange={(e) => setQ(e.target.value)} />
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
        </>
      )}
    </div>
  );
}
