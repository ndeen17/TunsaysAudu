import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';
import Guest from '../models/Guest.js';
import { generateQrToken } from './qr.js';

// Maps normalized source headers to our canonical guest fields. Matching is
// substring-based so small variations in the RSVP export ("Phone Number" vs
// "Phone") still resolve correctly; unmapped columns (address, city, etc.)
// are simply ignored.
const HEADER_RULES = [
  { field: 'firstName', patterns: ['first name', 'firstname'] },
  { field: 'lastName', patterns: ['last name', 'lastname'] },
  { field: 'envelopeName', patterns: ['envelope name'] },
  { field: 'email', patterns: ['email'] },
  { field: 'phone', patterns: ['phone'] },
  { field: 'tags', patterns: ['tags'] },
  { field: 'partyId', patterns: ['party'] },
  { field: 'rsvp', patterns: ['rsvp'] },
];

function normalizeHeader(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[?.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchField(normalizedHeader) {
  const rule = HEADER_RULES.find((r) => r.patterns.some((p) => normalizedHeader.includes(p)));
  return rule?.field ?? null;
}

function parseRsvp(raw) {
  const value = String(raw ?? '').toLowerCase();
  if (!value.trim()) return 'pending';
  if (value.includes('decline') || value.includes('no,') || value === 'no') return 'no';
  if (value.includes('yes')) return 'yes';
  return 'pending';
}

function parseTags(raw) {
  return String(raw ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

async function loadWorkbook(buffer, filename) {
  const workbook = new ExcelJS.Workbook();
  if (/\.csv$/i.test(filename)) {
    await workbook.csv.read(Readable.from(buffer));
  } else {
    await workbook.xlsx.load(buffer);
  }
  return workbook;
}

// Parses the uploaded file into normalized guest-shaped rows. Pure function,
// no DB access — safe to call for a preview.
export async function parseGuestRows(buffer, filename) {
  const workbook = await loadWorkbook(buffer, filename);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('No worksheet found in the uploaded file');

  const headerRow = sheet.getRow(1);
  const columnFields = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const field = matchField(normalizeHeader(cell.value));
    if (field) columnFields[colNumber] = field;
  });

  if (!Object.values(columnFields).includes('firstName')) {
    throw new Error('Could not find a "First Name" column in the uploaded file');
  }

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const raw = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const field = columnFields[colNumber];
      if (field) raw[field] = cell.value;
    });
    const firstName = String(raw.firstName ?? '').trim();
    if (!firstName) return; // skip blank rows

    rows.push({
      firstName,
      lastName: String(raw.lastName ?? '').trim(),
      envelopeName: String(raw.envelopeName ?? '').trim(),
      email: String(raw.email ?? '').trim().toLowerCase(),
      phone: String(raw.phone ?? '').trim(),
      tags: parseTags(raw.tags),
      partyId: String(raw.partyId ?? '').trim(),
      rsvpStatus: parseRsvp(raw.rsvp),
    });
  });

  return rows;
}

function matchKeyFor(row) {
  if (row.email) return `email:${row.email}`;
  return `name:${row.firstName.toLowerCase()}|${row.lastName.toLowerCase()}|${row.partyId.toLowerCase()}`;
}

// Classifies each parsed row as new / updated / unchanged against the
// current DB state, without writing anything.
export async function buildImportPlan(rows) {
  const existing = await Guest.find({}, 'firstName lastName email partyId tags rsvpStatus').lean();
  const byKey = new Map();
  for (const g of existing) {
    byKey.set(matchKeyFor({ ...g, email: g.email ?? '', partyId: g.partyId ?? '' }), g);
  }

  const plan = rows.map((row) => {
    const match = byKey.get(matchKeyFor(row));
    if (!match) return { action: 'create', row };
    const changed =
      match.firstName !== row.firstName ||
      match.lastName !== row.lastName ||
      match.rsvpStatus !== row.rsvpStatus ||
      JSON.stringify(match.tags ?? []) !== JSON.stringify(row.tags);
    return { action: changed ? 'update' : 'unchanged', row, existingId: match._id };
  });

  const summary = plan.reduce(
    (acc, p) => ({ ...acc, [p.action]: acc[p.action] + 1 }),
    { create: 0, update: 0, unchanged: 0 }
  );

  return { plan, summary, total: rows.length };
}

// Applies a previously-built plan: creates new guests (with a fresh QR
// token) and updates changed fields on existing ones. qrToken is never
// touched on update — regenerating it would invalidate an invite already
// sent out.
export async function applyImportPlan(plan) {
  let created = 0;
  let updated = 0;

  for (const item of plan) {
    if (item.action === 'unchanged') continue;
    if (item.action === 'create') {
      await Guest.create({ ...item.row, qrToken: generateQrToken() });
      created += 1;
    } else {
      await Guest.updateOne(
        { _id: item.existingId },
        {
          $set: {
            firstName: item.row.firstName,
            lastName: item.row.lastName,
            envelopeName: item.row.envelopeName,
            email: item.row.email,
            phone: item.row.phone,
            tags: item.row.tags,
            partyId: item.row.partyId,
            rsvpStatus: item.row.rsvpStatus,
          },
        }
      );
      updated += 1;
    }
  }

  return { created, updated };
}

// Short-lived server-side cache so the preview -> confirm UI flow doesn't
// require re-uploading the file. Single-instance in-memory store is fine at
// this app's scale (one small event, one running process).
const PENDING_TTL_MS = 10 * 60 * 1000;
const pendingImports = new Map();

function sweepExpired() {
  const now = Date.now();
  for (const [id, entry] of pendingImports) {
    if (entry.expiresAt < now) pendingImports.delete(id);
  }
}

export function stashPendingImport(plan) {
  sweepExpired();
  const importId = randomUUID();
  pendingImports.set(importId, { plan, expiresAt: Date.now() + PENDING_TTL_MS });
  return importId;
}

export function takePendingImport(importId) {
  sweepExpired();
  const entry = pendingImports.get(importId);
  if (!entry) return null;
  pendingImports.delete(importId);
  return entry.plan;
}
