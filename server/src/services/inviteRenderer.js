import sharp from 'sharp';
import { inviteFontFaceCss, DISPLAY_FONT_FAMILY, BODY_FONT_FAMILY } from './fonts.js';
import { INVITE_CONTENT } from './inviteContent.js';

const WIDTH = 1080;
const HEIGHT = 1560;

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

function estimateWidth(text, fontSize, avgCharWidthRatio = 0.55) {
  return text.length * fontSize * avgCharWidthRatio;
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
export async function renderInvitePng({ displayName, qrBuffer }) {
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
  y += verseLines.length * 42 + 70;

  // Date row: DAY NAME | MONTH DAY | YEAR, with the month/day emphasized in
  // the middle and thin vertical dividers either side.
  const monthDaySize = 46;
  const sideSize = 26;
  const monthDayHalfWidth = estimateWidth(c.monthDay, monthDaySize) / 2;
  const dividerGap = 34;
  parts.push(text(cx, y, c.monthDay, { size: monthDaySize, weight: 800, spacing: 2 }));
  const leftDividerX = cx - monthDayHalfWidth - dividerGap;
  const rightDividerX = cx + monthDayHalfWidth + dividerGap;
  parts.push(`<line x1="${leftDividerX}" y1="${y - 34}" x2="${leftDividerX}" y2="${y + 8}" stroke="${COLOR.gold}" stroke-width="1.5" />`);
  parts.push(`<line x1="${rightDividerX}" y1="${y - 34}" x2="${rightDividerX}" y2="${y + 8}" stroke="${COLOR.gold}" stroke-width="1.5" />`);
  parts.push(text(leftDividerX - 24, y - 6, c.dayName, { size: sideSize, weight: 500, spacing: 2, anchor: 'end', fill: COLOR.creamMuted }));
  parts.push(text(rightDividerX + 24, y - 6, c.year, { size: sideSize, weight: 500, spacing: 2, anchor: 'start', fill: COLOR.creamMuted }));

  y += 70;
  parts.push(text(cx, y, c.location, { size: 30, weight: 500, spacing: 6, fill: COLOR.cream }));

  // Guest QR box.
  const boxWidth = 860;
  const boxHeight = 200;
  const boxX = cx - boxWidth / 2;
  const boxY = y + 60;
  const qrSize = 150;
  const qrPad = 34;
  const qrX = boxX + qrPad;
  const qrY = boxY + (boxHeight - qrSize) / 2;
  const qrBase64 = qrBuffer.toString('base64');

  parts.push(
    `<rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="14" fill="rgba(246,237,225,0.05)" stroke="${COLOR.gold}" stroke-width="1.5" />`
  );
  parts.push(`<rect x="${qrX - 6}" y="${qrY - 6}" width="${qrSize + 12}" height="${qrSize + 12}" rx="8" fill="#ffffff" />`);
  parts.push(`<image href="data:image/png;base64,${qrBase64}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" />`);

  const textStartX = qrX + qrSize + 44;
  const textBlockWidth = boxX + boxWidth - 36 - textStartX;
  parts.push(
    text(textStartX, boxY + 78, displayName.toUpperCase(), {
      size: 32,
      weight: 800,
      fill: COLOR.gold,
      spacing: 1,
      anchor: 'start',
    })
  );
  const noteLines = wrapText('Please scan this QR code at the venue for entry', textBlockWidth, 22, 0.48);
  parts.push(
    textLines(textStartX, boxY + 116, noteLines, {
      size: 22,
      family: BODY_FONT_FAMILY,
      fill: COLOR.creamMuted,
      anchor: 'start',
      lineHeight: 30,
    })
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">${parts.join('\n')}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
