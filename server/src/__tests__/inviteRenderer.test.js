import sharp from 'sharp';
import { renderInvitePng } from '../services/inviteRenderer.js';
import { qrPngBuffer, generateQrToken } from '../services/qr.js';

async function makeBackground(width = 800, height = 600) {
  return sharp({ create: { width, height, channels: 3, background: { r: 250, g: 247, b: 242 } } })
    .png()
    .toBuffer();
}

// SVG rasterization with an embedded webfont is slower than jest's default
// 5s test timeout, especially on the first call in a fresh worker process —
// each test below passes an explicit longer timeout as its third argument.
const RENDER_TIMEOUT = 20000;

describe('renderInvitePng', () => {
  test('produces a PNG at the background\'s resolution with the name and QR composited on', async () => {
    const backgroundBuffer = await makeBackground(800, 600);
    const qrBuffer = await qrPngBuffer(generateQrToken());
    const layout = {
      namePos: { x: 400, y: 420 },
      nameStyle: { fontSize: 64, color: '#2a2420', letterSpacing: 2, uppercase: false },
      qrPos: { x: 290, y: 470 },
      qrSize: 220,
    };

    const png = await renderInvitePng({ backgroundBuffer, layout, displayName: 'Jane Doe', qrBuffer });
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(600);
  }, RENDER_TIMEOUT);

  test('escapes XML-special characters in the guest name without throwing', async () => {
    const backgroundBuffer = await makeBackground(400, 300);
    const qrBuffer = await qrPngBuffer(generateQrToken());
    const layout = {
      namePos: { x: 200, y: 200 },
      nameStyle: { fontSize: 32, color: '#000000', letterSpacing: 0, uppercase: false },
      qrPos: { x: 10, y: 10 },
      qrSize: 80,
    };

    await expect(
      renderInvitePng({ backgroundBuffer, layout, displayName: `Mr & Mrs O'Brien <VIP>`, qrBuffer })
    ).resolves.toBeInstanceOf(Buffer);
  }, RENDER_TIMEOUT);

  test('uppercase style renders without error', async () => {
    const backgroundBuffer = await makeBackground(400, 300);
    const qrBuffer = await qrPngBuffer(generateQrToken());
    const layout = {
      namePos: { x: 200, y: 200 },
      nameStyle: { fontSize: 32, color: '#000000', letterSpacing: 4, uppercase: true },
      qrPos: { x: 10, y: 10 },
      qrSize: 80,
    };

    const png = await renderInvitePng({ backgroundBuffer, layout, displayName: 'ada okafor', qrBuffer });
    expect(png.length).toBeGreaterThan(0);
  }, RENDER_TIMEOUT);
});
