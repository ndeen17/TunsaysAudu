async function handle(res) {
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error((body && body.error) || `Request failed: ${res.status}`);
  }
  return body;
}

export function get(path, params) {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  return fetch(`/api${path}${qs}`, { credentials: 'include' }).then(handle);
}

export function post(path, data) {
  return fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data ?? {}),
  }).then(handle);
}

export function patch(path, data) {
  return fetch(`/api${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data ?? {}),
  }).then(handle);
}

export function put(path, data) {
  return fetch(`/api${path}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data ?? {}),
  }).then(handle);
}

export function postForm(path, formData) {
  return fetch(`/api${path}`, { method: 'POST', credentials: 'include', body: formData }).then(handle);
}

// For binary responses (invite PNG / zip download) — triggers a browser
// download rather than trying to parse the body as JSON.
export async function downloadFile(path, options = {}) {
  const res = await fetch(`/api${path}`, { credentials: 'include', ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Download failed: ${res.status}`);
  }
  const disposition = res.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : 'download';
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
