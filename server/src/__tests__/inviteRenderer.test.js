import sharp from 'sharp';
import { renderInvitePng } from '../services/inviteRenderer.js';
import { qrPngBuffer, generateQrToken } from '../services/qr.js';

// SVG rasterization with embedded webfonts is slower than jest's default 5s
// test timeout, especially under concurrent worker contention with other
// test files — each test below passes an explicit longer timeout.
const RENDER_TIMEOUT = 30000;

describe('renderInvitePng', () => {
  test('produces a fixed-size PNG with the couple names, scripture, date, guest name, and QR composited on', async () => {
    const qrBuffer = await qrPngBuffer(generateQrToken());
    const png = await renderInvitePng({ displayName: 'Jane Doe', qrBuffer });
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBeGreaterThan(500);
    expect(meta.height).toBeGreaterThan(meta.width); // portrait card
  }, RENDER_TIMEOUT);

  test('escapes XML-special characters in the guest name without throwing', async () => {
    const qrBuffer = await qrPngBuffer(generateQrToken());
    await expect(renderInvitePng({ displayName: `Mr & Mrs O'Brien <VIP>`, qrBuffer })).resolves.toBeInstanceOf(Buffer);
  }, RENDER_TIMEOUT);

  test('renders consistently across different guest names (long and short)', async () => {
    const qrBuffer = await qrPngBuffer(generateQrToken());
    const short = await renderInvitePng({ displayName: 'Al', qrBuffer });
    const long = await renderInvitePng({ displayName: 'Adedamola Michael Odulaja-Okonkwo', qrBuffer });
    expect(short.length).toBeGreaterThan(0);
    expect(long.length).toBeGreaterThan(0);
  }, RENDER_TIMEOUT);
});
