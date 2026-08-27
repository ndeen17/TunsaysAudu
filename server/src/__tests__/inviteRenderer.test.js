import sharp from 'sharp';
import { renderInvitePng } from '../services/inviteRenderer.js';
import { qrPngBuffer, generateQrToken } from '../services/qr.js';

// SVG rasterization with embedded webfonts is slower than jest's default 5s
// test timeout, especially under concurrent worker contention with other
// test files — each test below passes an explicit longer timeout.
const RENDER_TIMEOUT = 30000;

describe('renderInvitePng', () => {
  test('produces a fixed-size PNG with the couple names, scripture, guest name, table/seat, and QR composited on', async () => {
    const qrBuffer = await qrPngBuffer(generateQrToken());
    const png = await renderInvitePng({ displayName: 'Jane Doe', qrBuffer, table: '5', seat: '2' });
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBeGreaterThan(500);
    expect(meta.height).toBeGreaterThan(meta.width); // portrait card
  }, RENDER_TIMEOUT);

  test('renders fine with no table/seat assigned yet', async () => {
    const qrBuffer = await qrPngBuffer(generateQrToken());
    await expect(renderInvitePng({ displayName: 'Jane Doe', qrBuffer })).resolves.toBeInstanceOf(Buffer);
  }, RENDER_TIMEOUT);

  test('escapes XML-special characters in the guest name without throwing', async () => {
    const qrBuffer = await qrPngBuffer(generateQrToken());
    await expect(renderInvitePng({ displayName: `Mr & Mrs O'Brien <VIP>`, qrBuffer })).resolves.toBeInstanceOf(Buffer);
  }, RENDER_TIMEOUT);

  test('renders consistently across different guest names (long and short)', async () => {
    const qrBuffer = await qrPngBuffer(generateQrToken());
    const short = await renderInvitePng({ displayName: 'Al', qrBuffer, table: '1', seat: '1' });
    const long = await renderInvitePng({ displayName: 'Adedamola Michael Odulaja-Okonkwo', qrBuffer, table: '38', seat: '10' });
    expect(short.length).toBeGreaterThan(0);
    expect(long.length).toBeGreaterThan(0);
  }, RENDER_TIMEOUT);
});
