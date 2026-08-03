import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_FAMILY = 'Invite Name';
const FONT_PATH = path.join(
  __dirname,
  '../../node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2'
);

let cachedFontFace;

// Embeds the font as a base64 data URI directly in the SVG's <style> block
// so rendering doesn't depend on any font being installed on the host OS —
// verified to work with sharp's bundled librsvg (see the woff2 smoke test).
export function inviteFontFaceCss() {
  if (!cachedFontFace) {
    const base64 = fs.readFileSync(FONT_PATH).toString('base64');
    cachedFontFace = `@font-face { font-family: '${FONT_FAMILY}'; src: url(data:font/woff2;base64,${base64}) format('woff2'); }`;
  }
  return cachedFontFace;
}

export const INVITE_FONT_FAMILY = FONT_FAMILY;
