import { customAlphabet } from 'nanoid';
import QRCode from 'qrcode';

// Unguessable per-guest token. Alphabet avoids visually ambiguous characters
// since this may occasionally need to be read/typed by a human as a fallback.
const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz', 24);

export function generateQrToken() {
  return nanoid();
}

// The QR encodes only the bare token — not a URL — so a photo of the printed
// invite can't be used to hit the check-in API directly without going through
// the authenticated scanner app.
export async function qrPngBuffer(token) {
  return QRCode.toBuffer(token, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 600,
  });
}
