import sharp from 'sharp';
import { inviteFontFaceCss, INVITE_FONT_FAMILY } from './fonts.js';
import { INVITE_CONTENT } from './inviteContent.js';

function escapeXml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

// Rough word-wrap: no real text-measurement available without a browser, so
// this estimates characters-per-line from font size. Fine for the fixed,
// known copy on this invite — not meant for arbitrary user text.
function wrapText(text, maxWidth, fontSize, avgCharWidthRatio = 0.52) {
  const maxChars = Math.max(8, Math.floor(maxWidth / (fontSize * avgCharWidthRatio)));
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (trial.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function textBlock({ x, y, lines, fontSize, fontWeight = 500, fontStyle = 'normal', fill, letterSpacing = 0, lineHeight = 1.35 }) {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * fontSize * lineHeight}" font-family="${INVITE_FONT_FAMILY}" font-size="${fontSize.toFixed(1)}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="${fill}" letter-spacing="${letterSpacing}" text-anchor="middle">${escapeXml(line)}</text>`
    )
    .join('\n');
}

// Composites the full invite — couple names, scripture, date/venue, the
// guest's name, and their QR code — onto the background. Layout is a fixed
// template computed from the background's own resolution (fractions tuned
// against this wedding's actual artwork), not manually positioned per guest.
export async function renderInvitePng({ backgroundBuffer, displayName, qrBuffer }) {
  const { width, height } = await sharp(backgroundBuffer).metadata();
  const cx = width / 2;

  const coupleFontSize = width * 0.052;
  const verseFontSize = width * 0.026;
  const dateFontSize = width * 0.024;
  const nameFontSize = width * 0.05;
  const qrSize = width * 0.19;

  const verseLines = wrapText(INVITE_CONTENT.verse, width * 0.62, verseFontSize);
  const parts = [];
  let y = height * 0.4;

  parts.push(
    textBlock({ x: cx, y, lines: [INVITE_CONTENT.coupleNames], fontSize: coupleFontSize, fontWeight: 600, letterSpacing: 1, fill: '#4a3b2a' })
  );
  y += coupleFontSize * 1.4 + height * 0.015;

  parts.push(
    textBlock({ x: cx, y, lines: verseLines, fontSize: verseFontSize, fontStyle: 'italic', lineHeight: 1.45, fill: '#6b5842' })
  );
  y += verseLines.length * verseFontSize * 1.45 + height * 0.025;

  parts.push(
    textBlock({
      x: cx,
      y,
      lines: [`${INVITE_CONTENT.date} · ${INVITE_CONTENT.location}`],
      fontSize: dateFontSize,
      letterSpacing: 1,
      fill: '#6b5842',
    })
  );
  y += dateFontSize * 1.6 + height * 0.03;

  parts.push(
    textBlock({ x: cx, y, lines: [displayName], fontSize: nameFontSize, fontWeight: 600, letterSpacing: 1.5, fill: '#2a2118' })
  );
  y += nameFontSize * 1.1 + height * 0.025;

  const qrTop = y;
  const qrLeft = cx - qrSize / 2;

  const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><style>${inviteFontFaceCss()}</style></defs>
    ${parts.join('\n')}
  </svg>`;

  const resizedQr = await sharp(qrBuffer).resize(Math.round(qrSize), Math.round(qrSize)).png().toBuffer();

  return sharp(backgroundBuffer)
    .composite([
      { input: Buffer.from(textSvg), top: 0, left: 0 },
      { input: resizedQr, top: Math.round(qrTop), left: Math.round(qrLeft) },
    ])
    .png()
    .toBuffer();
}
