import request from 'supertest';
import { createApp } from '../app.js';
import Guest from '../models/Guest.js';
import { generateQrToken } from '../services/qr.js';
import { connect, disconnect, clearCollections } from '../testUtils/testDb.js';

const app = createApp();

async function makeGuest(overrides = {}) {
  return Guest.create({
    firstName: 'Jane',
    lastName: 'Doe',
    qrToken: generateQrToken(),
    ...overrides,
  });
}

describe('POST /api/guest-access/find', () => {
  beforeAll(connect);
  afterEach(clearCollections);
  afterAll(disconnect);

  test('requires both first and last name', async () => {
    const res = await request(app).post('/api/guest-access/find').send({ firstName: 'Jane' });
    expect(res.status).toBe(400);
  });

  test('no match returns 404', async () => {
    const res = await request(app).post('/api/guest-access/find').send({ firstName: 'Nobody', lastName: 'Here' });
    expect(res.status).toBe(404);
  });

  test('finds a guest case-insensitively and returns their id, display name, table, and seat', async () => {
    const guest = await makeGuest({ table: '5', seat: '2' });
    const res = await request(app).post('/api/guest-access/find').send({ firstName: 'jane', lastName: 'DOE' });
    expect(res.status).toBe(200);
    expect(res.body.guestId).toBe(String(guest._id));
    expect(res.body.displayName).toBe('Jane Doe');
    expect(res.body.table).toBe('5');
    expect(res.body.seat).toBe('2');
  });

  test('two guests sharing a name return disambiguation options instead of a single id', async () => {
    await makeGuest({ envelopeName: 'Jane Doe & family' });
    await makeGuest({ envelopeName: 'Jane Doe (plus one)' });

    const res = await request(app).post('/api/guest-access/find').send({ firstName: 'Jane', lastName: 'Doe' });
    expect(res.status).toBe(200);
    expect(res.body.guestId).toBeUndefined();
    expect(res.body.options).toHaveLength(2);
    expect(res.body.options.map((o) => o.displayName).sort()).toEqual(['Jane Doe & family', 'Jane Doe (plus one)']);
  });
});

describe('GET /api/guest-access/:guestId/qr.png', () => {
  beforeAll(connect);
  afterEach(clearCollections);
  afterAll(disconnect);

  test('returns just the QR, not the full card, and records inviteGeneratedAt', async () => {
    const guest = await makeGuest();
    const res = await request(app).get(`/api/guest-access/${guest._id}/qr.png`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.body.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');

    const stored = await Guest.findById(guest._id);
    expect(stored.inviteGeneratedAt).not.toBeNull();
  }, 15000);

  test('unknown guest id returns 404', async () => {
    const res = await request(app).get('/api/guest-access/000000000000000000000000/qr.png');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/guest-access/:guestId/invite.png', () => {
  beforeAll(connect);
  afterEach(clearCollections);
  afterAll(disconnect);

  test('returns a PNG for a real guest and records inviteGeneratedAt', async () => {
    const guest = await makeGuest();
    const res = await request(app).get(`/api/guest-access/${guest._id}/invite.png`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.body.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');

    const stored = await Guest.findById(guest._id);
    expect(stored.inviteGeneratedAt).not.toBeNull();
  }, 20000);

  test('unknown guest id returns 404', async () => {
    const res = await request(app).get('/api/guest-access/000000000000000000000000/invite.png');
    expect(res.status).toBe(404);
  });
});
