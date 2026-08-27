import sharp from 'sharp';
import { inviteFontFaceCss, DISPLAY_FONT_FAMILY, BODY_FONT_FAMILY } from './fonts.js';
import { INVITE_CONTENT } from './inviteContent.js';

const WIDTH = 1080;
const HEIGHT = 1600;

const COLOR = {
  bgDark: '#2b0404',
  bgMid: '#4d0909',
  cream: '#f6ede1',
  creamMuted: 'rgba(246,237,225,0.78)',
  gold: '#c9a45c',
};

function escapeXml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

// Rough word-wrap: no real text-measurement available without a browser, so
// this estimates characters-per-line from font size. Fine for the fixed,
// known copy on this invite — not meant for arbitrary user text.
function wrapText(text, maxWidth, fontSize, avgCharWidthRatio = 0.5) {
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

function text(x, y, str, { size, family = DISPLAY_FONT_FAMILY, weight = 500, style = 'normal', fill = COLOR.cream, spacing = 0, anchor = 'middle' }) {
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" font-style="${style}" fill="${fill}" letter-spacing="${spacing}" text-anchor="${anchor}">${escapeXml(str)}</text>`;
}

function textLines(x, y, lines, opts) {
  const lineHeight = (opts.lineHeight ?? opts.size * 1.4);
  return lines.map((line, i) => text(x, y + i * lineHeight, line, opts)).join('\n');
}

// Builds the full invite card as one self-contained SVG — background,
// decorative arch frame, all copy, the guest's name, and their QR code all
// drawn in code (no uploaded artwork). Deterministic and identical in
// layout for every guest; only the name and QR differ.
export async function renderInvitePng({ displayName, qrBuffer, table, seat }) {
  const cx = WIDTH / 2;
  const c = INVITE_CONTENT;
  const parts = [];

  // Background with a soft vignette toward the edges.
  parts.push(`
    <defs>
      <style>${inviteFontFaceCss()}</style>
      <radialGradient id="vignette" cx="50%" cy="42%" r="75%">
        <stop offset="0%" stop-color="${COLOR.bgMid}" />
        <stop offset="100%" stop-color="${COLOR.bgDark}" />
      </radialGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#vignette)" />
  `);

  // Arched frame.
  const frameMargin = 66;
  const frameLeft = frameMargin;
  const frameRight = WIDTH - frameMargin;
  const frameBottom = HEIGHT - frameMargin;
  const archY = 250;
  const archRx = (frameRight - frameLeft) / 2;
  const archRy = 150;
  parts.push(`
    <path d="M ${frameLeft} ${frameBottom} L ${frameLeft} ${archY} A ${archRx} ${archRy} 0 0 1 ${frameRight} ${archY} L ${frameRight} ${frameBottom}"
      fill="none" stroke="${COLOR.gold}" stroke-width="2" />
  `);

  let y = 210;
  parts.push(text(cx, y, c.familiesLine, { size: 26, weight: 500, fill: COLOR.creamMuted, spacing: 4 }));

  y += 110;
  parts.push(text(cx, y, c.firstNames[0], { size: 96, weight: 800, spacing: 4 }));

  y += 78;
  parts.push(`<line x1="${cx - 200}" y1="${y - 14}" x2="${cx - 40}" y2="${y - 14}" stroke="${COLOR.gold}" stroke-width="1.5" />`);
  parts.push(`<line x1="${cx + 40}" y1="${y - 14}" x2="${cx + 200}" y2="${y - 14}" stroke="${COLOR.gold}" stroke-width="1.5" />`);
  parts.push(text(cx, y, '&', { size: 40, weight: 500, fill: COLOR.gold }));

  y += 100;
  parts.push(text(cx, y, c.firstNames[1], { size: 96, weight: 800, spacing: 4 }));

  y += 90;
  const verseLines = wrapText(c.verse, WIDTH * 0.6, 30);
  parts.push(
    textLines(cx, y, verseLines, { size: 30, family: BODY_FONT_FAMILY, style: 'italic', fill: COLOR.creamMuted, lineHeight: 42 })
  );
  y += verseLines.length * 42 + 55;

  parts.push(text(cx, y, c.location, { size: 30, weight: 500, spacing: 6, fill: COLOR.cream }));

  // Guest QR box — name, table/seat, then a large centered QR, then a short
  // note, stacked vertically so the code itself is the dominant, easy-to-
  // scan element rather than sharing width with text.
  const boxWidth = WIDTH * 0.62;
  const boxX = cx - boxWidth / 2;
  const boxY = y + 80;
  const qrSize = WIDTH * 0.34;
  const nameSize = 32;
  const seatSize = 24;
  const noteSize = 23;
  const padTop = 44;
  const padBottom = 44;
  const gapAfterName = 16;
  const gapAfterSeat = 28;
  const gapAfterQr = 30;
  const noteLines = wrapText('Please scan this QR code at the venue for entry', boxWidth - 80, noteSize, 0.48);
  const noteBlockHeight = noteLines.length * noteSize * 1.35;
  const boxHeight =
    padTop + nameSize * 1.2 + gapAfterName + seatSize * 1.2 + gapAfterSeat + qrSize + gapAfterQr + noteBlockHeight + padBottom;

  parts.push(
    `<rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="18" fill="rgba(246,237,225,0.05)" stroke="${COLOR.gold}" stroke-width="1.5" />`
  );

  let innerY = boxY + padTop + nameSize;
  parts.push(text(cx, innerY, displayName.toUpperCase(), { size: nameSize, weight: 800, fill: COLOR.gold, spacing: 1 }));

  innerY += gapAfterName + seatSize;
  parts.push(
    text(cx, innerY, `TABLE ${table || '—'}   ·   SEAT ${seat || '—'}`, { size: seatSize, weight: 600, fill: COLOR.creamMuted, spacing: 1 })
  );

  const qrTop = innerY + gapAfterSeat;
  const qrLeft = cx - qrSize / 2;
  const qrBase64 = qrBuffer.toString('base64');
  parts.push(`<rect x="${qrLeft - 10}" y="${qrTop - 10}" width="${qrSize + 20}" height="${qrSize + 20}" rx="10" fill="#ffffff" />`);
  parts.push(`<image href="data:image/png;base64,${qrBase64}" x="${qrLeft}" y="${qrTop}" width="${qrSize}" height="${qrSize}" />`);

  innerY = qrTop + qrSize + gapAfterQr + noteSize;
  parts.push(textLines(cx, innerY, noteLines, { size: noteSize, family: BODY_FONT_FAMILY, fill: COLOR.creamMuted, lineHeight: noteSize * 1.35 }));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">${parts.join('\n')}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
