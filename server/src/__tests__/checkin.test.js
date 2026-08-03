import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import Guest from '../models/Guest.js';
import User from '../models/User.js';
import { generateQrToken } from '../services/qr.js';
import { connect, disconnect, clearCollections } from '../testUtils/testDb.js';

const app = createApp();

async function loginAs(role) {
  const username = `${role}-user`;
  await User.create({ username, passwordHash: await bcrypt.hash('password123', 4), role });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ username, password: 'password123' }).expect(200);
  return agent;
}

async function makeGuest(overrides = {}) {
  return Guest.create({
    firstName: 'Jane',
    lastName: 'Doe',
    qrToken: generateQrToken(),
    rsvpStatus: 'yes',
    table: '5',
    seat: '2',
    ...overrides,
  });
}

describe('POST /api/checkin/scan', () => {
  beforeAll(connect);
  afterEach(clearCollections);
  afterAll(disconnect);

  test('rejects unauthenticated requests', async () => {
    await request(app).post('/api/checkin/scan').send({ token: 'whatever' }).expect(401);
  });

  test('unknown token returns invalid', async () => {
    const security = await loginAs('security');
    const res = await security.post('/api/checkin/scan').send({ token: 'no-such-token' });
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('invalid');
  });

  test('first scan checks the guest in and returns their table/seat', async () => {
    const security = await loginAs('security');
    const guest = await makeGuest();

    const res = await security.post('/api/checkin/scan').send({ token: guest.qrToken });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('checked_in');
    expect(res.body.guest).toMatchObject({ firstName: 'Jane', lastName: 'Doe', table: '5', seat: '2' });

    const stored = await Guest.findById(guest._id);
    expect(stored.checkedIn).toBe(true);
    expect(stored.checkinEvents).toHaveLength(1);
    expect(stored.checkinEvents[0].overridden).toBe(false);
  });

  test('second scan without override is reported as a duplicate and does not re-check-in', async () => {
    const security = await loginAs('security');
    const guest = await makeGuest();

    await security.post('/api/checkin/scan').send({ token: guest.qrToken });
    const res = await security.post('/api/checkin/scan').send({ token: guest.qrToken });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('duplicate');
    expect(res.body.checkinCount).toBe(1);

    const stored = await Guest.findById(guest._id);
    expect(stored.checkinEvents).toHaveLength(1);
  });

  test('second scan with override records a second flagged check-in event', async () => {
    const security = await loginAs('security');
    const guest = await makeGuest();

    await security.post('/api/checkin/scan').send({ token: guest.qrToken });
    const res = await security.post('/api/checkin/scan').send({ token: guest.qrToken, override: true });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('checked_in_override');
    expect(res.body.checkinCount).toBe(2);

    const stored = await Guest.findById(guest._id);
    expect(stored.checkinEvents).toHaveLength(2);
    expect(stored.checkinEvents[1].overridden).toBe(true);
  });

  test('organizer role can also scan; a plain guest-list search fallback finds guests by name', async () => {
    const organizer = await loginAs('organizer');
    await makeGuest({ firstName: 'Kwame', lastName: 'Mensah' });

    const res = await organizer.get('/api/checkin/lookup').query({ q: 'kwam' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].firstName).toBe('Kwame');
  });
});

describe('security role field restriction on GET /api/guests', () => {
  beforeAll(connect);
  afterEach(clearCollections);
  afterAll(disconnect);

  test('security responses omit email/phone; organizer responses include them', async () => {
    await makeGuest({ email: 'jane@example.com', phone: '+1234' });

    const security = await loginAs('security');
    const secRes = await security.get('/api/guests');
    expect(secRes.body[0].email).toBeUndefined();
    expect(secRes.body[0].phone).toBeUndefined();
    expect(secRes.body[0].firstName).toBe('Jane');

    const organizer = await loginAs('organizer');
    const orgRes = await organizer.get('/api/guests');
    expect(orgRes.body[0].email).toBe('jane@example.com');
  });
});
