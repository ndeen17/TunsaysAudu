import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseGuestRows,
  buildImportPlan,
  applyImportPlan,
  stashPendingImport,
  takePendingImport,
} from '../services/excelImport.js';
import Guest from '../models/Guest.js';
import { connect, disconnect, clearCollections } from '../testUtils/testDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleCsvPath = path.join(__dirname, '../../../data/sample-guests.csv');

function loadSampleRows() {
  return parseGuestRows(fs.readFileSync(sampleCsvPath), 'sample-guests.csv');
}

describe('parseGuestRows (pure, no DB)', () => {
  test('maps the guest-list columns onto firstName/lastName/envelopeName/email', async () => {
    const rows = await loadSampleRows();
    expect(rows.length).toBe(15);

    const ada = rows.find((r) => r.firstName === 'Ada');
    expect(ada).toEqual({
      firstName: 'Ada',
      lastName: 'Okafor',
      envelopeName: 'Ada Okafor',
      email: 'ada.okafor.sample@example.com',
    });
  });

  test('ignores any other columns present in the file', async () => {
    const rows = await loadSampleRows();
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(['email', 'envelopeName', 'firstName', 'lastName']);
    }
  });
});

describe('pending import cache (pure, no DB)', () => {
  test('round-trips a plan once, then clears it', () => {
    const plan = [{ action: 'create', row: { firstName: 'Test' } }];
    const id = stashPendingImport(plan);
    expect(takePendingImport(id)).toEqual(plan);
    expect(takePendingImport(id)).toBeNull();
  });

  test('unknown importId returns null', () => {
    expect(takePendingImport('does-not-exist')).toBeNull();
  });
});

describe('import plan + apply (requires DB)', () => {
  beforeAll(connect);
  afterEach(clearCollections);
  afterAll(disconnect);

  test('first import classifies every row as create and assigns qrTokens', async () => {
    const rows = await loadSampleRows();
    const { plan, summary } = await buildImportPlan(rows);
    expect(summary).toEqual({ create: 15, update: 0, unchanged: 0 });

    await applyImportPlan(plan);
    const guests = await Guest.find({}).lean();
    expect(guests.length).toBe(15);
    expect(guests.every((g) => typeof g.qrToken === 'string' && g.qrToken.length > 0)).toBe(true);
    expect(new Set(guests.map((g) => g.qrToken)).size).toBe(15); // all unique
  });

  test('re-importing the identical file is a no-op and preserves qrTokens', async () => {
    const rows = await loadSampleRows();
    const { plan: firstPlan } = await buildImportPlan(rows);
    await applyImportPlan(firstPlan);
    const before = await Guest.find({}).sort({ firstName: 1 }).lean();

    const { plan: secondPlan, summary } = await buildImportPlan(await loadSampleRows());
    expect(summary).toEqual({ create: 0, update: 0, unchanged: 15 });
    await applyImportPlan(secondPlan);

    const after = await Guest.find({}).sort({ firstName: 1 }).lean();
    expect(after.map((g) => g.qrToken)).toEqual(before.map((g) => g.qrToken));
  });

  test('a changed envelope name on re-import is applied without touching the qrToken', async () => {
    const { plan: firstPlan } = await buildImportPlan(await loadSampleRows());
    await applyImportPlan(firstPlan);
    const originalToken = (await Guest.findOne({ firstName: 'Emeka' })).qrToken;

    const updatedRows = await loadSampleRows();
    updatedRows.find((r) => r.firstName === 'Emeka').envelopeName = 'Mr Emeka Nwosu';
    const { plan: secondPlan, summary } = await buildImportPlan(updatedRows);
    expect(summary.update).toBe(1);
    await applyImportPlan(secondPlan);

    const emeka = await Guest.findOne({ firstName: 'Emeka' });
    expect(emeka.envelopeName).toBe('Mr Emeka Nwosu');
    expect(emeka.qrToken).toBe(originalToken);
  });
});
