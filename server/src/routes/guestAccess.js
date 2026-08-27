import { Router } from 'express';
import Guest from '../models/Guest.js';
import { renderInvitePng } from '../services/inviteRenderer.js';
import { qrPngBuffer } from '../services/qr.js';

// Public, unauthenticated routes — guests find their own invite by name
// instead of staff generating and sending it. No login required; the only
// "secret" a guest needs is their own name, and what they get back (a QR
// tied to their single qrToken) is exactly what staff would otherwise hand
// them at the door.
const router = Router();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactCi(value) {
  return new RegExp(`^${escapeRegex(value.trim())}$`, 'i');
}

router.post('/find', async (req, res) => {
  const { firstName, lastName } = req.body ?? {};
  if (!firstName?.trim() || !lastName?.trim()) {
    return res.status(400).json({ error: 'Please enter both your first and last name.' });
  }

  const matches = await Guest.find({
    firstName: exactCi(firstName),
    lastName: exactCi(lastName),
  }).select('firstName lastName envelopeName');

  if (matches.length === 0) {
    return res.status(404).json({ error: "We couldn't find an invite under that name. Please check the spelling." });
  }

  if (matches.length === 1) {
    return res.json({ guestId: matches[0]._id });
  }

  // Rare (shared name) — let the guest pick their own envelope rather than
  // guessing which record is theirs.
  res.json({ options: matches.map((g) => ({ guestId: g._id, envelopeName: g.envelopeName || `${g.firstName} ${g.lastName}` })) });
});

router.get('/:guestId/invite.png', async (req, res) => {
  const guest = await Guest.findById(req.params.guestId);
  if (!guest) return res.status(404).json({ error: 'Guest not found' });

  const displayName = guest.envelopeName || `${guest.firstName} ${guest.lastName}`.trim();
  const qrBuffer = await qrPngBuffer(guest.qrToken);
  const png = await renderInvitePng({ displayName, qrBuffer });
  guest.inviteGeneratedAt = new Date();
  await guest.save();

  res.set('Content-Type', 'image/png');
  if (req.query.download) {
    const base = `${guest.firstName}_${guest.lastName}`.trim().replace(/[^a-z0-9_-]+/gi, '_');
    res.set('Content-Disposition', `attachment; filename="${base || guest._id}.png"`);
  }
  res.send(png);
});

export default router;
