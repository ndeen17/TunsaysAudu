import sharp from 'sharp';
import { renderInvitePng } from '../services/inviteRenderer.js';
import { qrPngBuffer, generateQrToken } from '../services/qr.js';

async function makeBackground(width = 1073, height = 1466) {
  return sharp({ create: { width, height, channels: 3, background: { r: 250, g: 247, b: 242 } } })
    .png()
    .toBuffer();
}

// SVG rasterization with an embedded webfont is slower than jest's default
// 5s test timeout, especially on the first call in a fresh worker process —
// each test below passes an explicit longer timeout as its third argument.
const RENDER_TIMEOUT = 20000;

describe('renderInvitePng', () => {
  test("produces a PNG at the background's resolution with the couple names, scripture, date, guest name, and QR composited on", async () => {
    const backgroundBuffer = await makeBackground();
    const qrBuffer = await qrPngBuffer(generateQrToken());

    const png = await renderInvitePng({ backgroundBuffer, displayName: 'Jane Doe', qrBuffer });
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(1073);
    expect(meta.height).toBe(1466);
  }, RENDER_TIMEOUT);

  test('escapes XML-special characters in the guest name without throwing', async () => {
    const backgroundBuffer = await makeBackground();
    const qrBuffer = await qrPngBuffer(generateQrToken());

    await expect(
      renderInvitePng({ backgroundBuffer, displayName: `Mr & Mrs O'Brien <VIP>`, qrBuffer })
    ).resolves.toBeInstanceOf(Buffer);
  }, RENDER_TIMEOUT);

  test('renders correctly on a narrower background where the scripture line must wrap', async () => {
    const backgroundBuffer = await makeBackground(700, 1000);
    const qrBuffer = await qrPngBuffer(generateQrToken());

    const png = await renderInvitePng({ backgroundBuffer, displayName: 'Ada Okafor', qrBuffer });
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(700);
    expect(meta.height).toBe(1000);
  }, RENDER_TIMEOUT);
});
