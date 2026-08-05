import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORMORANT_DIR = path.join(__dirname, '../../node_modules/@fontsource/cormorant-garamond/files');
const PLAYFAIR_DIR = path.join(__dirname, '../../node_modules/@fontsource/playfair-display/files');

export const DISPLAY_FONT_FAMILY = 'Invite Display'; // Playfair Display — headline caps (couple names, date, labels)
export const BODY_FONT_FAMILY = 'Invite Body'; // Cormorant Garamond — softer supporting/verse text

let cachedFontFaceCss;

function fontFace(family, weight, style, dir, filename) {
  const base64 = fs.readFileSync(path.join(dir, filename)).toString('base64');
  return `@font-face { font-family: '${family}'; font-weight: ${weight}; font-style: ${style}; src: url(data:font/woff2;base64,${base64}) format('woff2'); }`;
}

// Embeds fonts as base64 data URIs directly in the SVG's <style> block so
// rendering doesn't depend on any font being installed on the host OS —
// verified to work with sharp's bundled librsvg.
export function inviteFontFaceCss() {
  if (!cachedFontFaceCss) {
    cachedFontFaceCss = [
      fontFace(DISPLAY_FONT_FAMILY, 500, 'normal', PLAYFAIR_DIR, 'playfair-display-latin-500-normal.woff2'),
      fontFace(DISPLAY_FONT_FAMILY, 800, 'normal', PLAYFAIR_DIR, 'playfair-display-latin-800-normal.woff2'),
      fontFace(BODY_FONT_FAMILY, 500, 'normal', CORMORANT_DIR, 'cormorant-garamond-latin-500-normal.woff2'),
      fontFace(BODY_FONT_FAMILY, 500, 'italic', CORMORANT_DIR, 'cormorant-garamond-latin-500-italic.woff2'),
      fontFace(BODY_FONT_FAMILY, 600, 'normal', CORMORANT_DIR, 'cormorant-garamond-latin-600-normal.woff2'),
    ].join(' ');
  }
  return cachedFontFaceCss;
}
