import { customAlphabet } from 'nanoid';
import QRCode from 'qrcode';

// Unguessable per-guest token. Alphabet avoids visually ambiguous characters
// since this may occasionally need to be read/typed by a human as a fallback.
const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz', 24);

export function generateQrToken() {
  return nanoid();
}

// The QR encodes a full URL (not just the bare token) so guests' phones,
// and staff scanning with their own camera app rather than the in-app
// scanner, open it directly. The /scan/:token page still requires an
// organizer/security login to actually check anyone in — so a token being
// visible in the URL doesn't let a stranger self-check-in, it just makes
// the link openable by any camera app instead of only our own scanner page.
export function checkinUrl(token) {
  const base = (process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return `${base}/scan/${token}`;
}

export async function qrPngBuffer(token) {
  return QRCode.toBuffer(checkinUrl(token), {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 600,
  });
}
