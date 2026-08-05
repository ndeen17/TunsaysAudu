export default function CheckinResultCard({ result, onOverride, onNext, nextLabel = 'Scan next' }) {
  if (result.status === 'invalid') {
    return (
      <div className="result-card result-invalid">
        <h2>Invalid QR</h2>
        <p>This code doesn't match any guest.</p>
        <button onClick={onNext}>{nextLabel}</button>
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
        <button onClick={onNext}>{nextLabel}</button>
      </div>
    );
  }

  return (
    <div className="result-card result-success">
      <h2>{result.status === 'checked_in_override' ? 'Welcome back!' : 'Welcome!'}</h2>
      <p className="guest-name">
        {guest.firstName} {guest.lastName}
      </p>
      <p className="checkin-subtitle">You're checked in — enjoy the celebration!</p>
      <p>
        Table {guest.table || '—'} · Seat {guest.seat || '—'}
      </p>
      <button onClick={onNext}>{nextLabel}</button>
    </div>
  );
}
