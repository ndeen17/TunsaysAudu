import { checkinUrl, generateQrToken, qrPngBuffer } from '../services/qr.js';

describe('checkinUrl', () => {
  const originalUrl = process.env.PUBLIC_APP_URL;
  afterEach(() => {
    process.env.PUBLIC_APP_URL = originalUrl;
  });

  test('builds a /scan/:token URL from PUBLIC_APP_URL', () => {
    process.env.PUBLIC_APP_URL = 'https://tunsaysaudu.onrender.com';
    expect(checkinUrl('abc123')).toBe('https://tunsaysaudu.onrender.com/scan/abc123');
  });

  test('strips a trailing slash on the base URL', () => {
    process.env.PUBLIC_APP_URL = 'https://tunsaysaudu.onrender.com/';
    expect(checkinUrl('abc123')).toBe('https://tunsaysaudu.onrender.com/scan/abc123');
  });

  test('falls back to localhost when PUBLIC_APP_URL is not set', () => {
    delete process.env.PUBLIC_APP_URL;
    expect(checkinUrl('abc123')).toBe('http://localhost:5173/scan/abc123');
  });
});

describe('qrPngBuffer', () => {
  test('produces a real PNG', async () => {
    const png = await qrPngBuffer(generateQrToken());
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a'); // PNG magic bytes
  }, 15000);
});
