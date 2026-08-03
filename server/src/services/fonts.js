import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_FAMILY = 'Invite Name';
const FONT_DIR = path.join(__dirname, '../../node_modules/@fontsource/cormorant-garamond/files');

let cachedFontFaceCss;

function fontFace(weight, style, filename) {
  const base64 = fs.readFileSync(path.join(FONT_DIR, filename)).toString('base64');
  return `@font-face { font-family: '${FONT_FAMILY}'; font-weight: ${weight}; font-style: ${style}; src: url(data:font/woff2;base64,${base64}) format('woff2'); }`;
}

// Embeds the font as base64 data URIs directly in the SVG's <style> block so
// rendering doesn't depend on any font being installed on the host OS —
// verified to work with sharp's bundled librsvg (see the woff2 smoke test).
// Both upright (guest name, headings) and italic (scripture line) weights
// are needed for the full invite composition.
export function inviteFontFaceCss() {
  if (!cachedFontFaceCss) {
    cachedFontFaceCss = [
      fontFace(500, 'normal', 'cormorant-garamond-latin-500-normal.woff2'),
      fontFace(600, 'normal', 'cormorant-garamond-latin-600-normal.woff2'),
      fontFace(500, 'italic', 'cormorant-garamond-latin-500-italic.woff2'),
    ].join(' ');
  }
  return cachedFontFaceCss;
}

export const INVITE_FONT_FAMILY = FONT_FAMILY;
