import sharp from 'sharp';
import { inviteFontFaceCss, INVITE_FONT_FAMILY } from './fonts.js';

function escapeXml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

// Composites a guest's name + QR code onto the invite background. Pure
// function (no DB access) so it's easy to unit test and to swap later if
// needed — background/layout/QR are all passed in already resolved.
export async function renderInvitePng({ backgroundBuffer, layout, displayName, qrBuffer }) {
  const meta = await sharp(backgroundBuffer).metadata();
  const { width, height } = meta;
  const { fontSize, color, letterSpacing, uppercase } = layout.nameStyle;
  const text = uppercase ? displayName.toUpperCase() : displayName;

  const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><style>${inviteFontFaceCss()}</style></defs>
    <text x="${layout.namePos.x}" y="${layout.namePos.y}" font-family="${INVITE_FONT_FAMILY}" font-size="${fontSize}" fill="${color}" letter-spacing="${letterSpacing}" text-anchor="middle" dominant-baseline="middle">${escapeXml(text)}</text>
  </svg>`;

  const resizedQr = await sharp(qrBuffer)
    .resize(Math.round(layout.qrSize), Math.round(layout.qrSize))
    .png()
    .toBuffer();

  return sharp(backgroundBuffer)
    .composite([
      { input: Buffer.from(textSvg), top: 0, left: 0 },
      { input: resizedQr, top: Math.round(layout.qrPos.y), left: Math.round(layout.qrPos.x) },
    ])
    .png()
    .toBuffer();
}
