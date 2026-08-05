import { Router } from 'express';
import archiver from 'archiver';
import Guest from '../models/Guest.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { renderInvitePng } from '../services/inviteRenderer.js';
import { qrPngBuffer, generateQrToken } from '../services/qr.js';

const router = Router();
router.use(requireAuth, requireRole('organizer'));

function fileNameFor(guest) {
  const base = `${guest.firstName}_${guest.lastName}`.trim().replace(/[^a-z0-9_-]+/gi, '_');
  return `${base || guest._id}.png`;
}

router.get('/preview', async (req, res) => {
  const qrBuffer = await qrPngBuffer(generateQrToken());
  const png = await renderInvitePng({ displayName: 'Jane Doe', qrBuffer });
  res.set('Content-Type', 'image/png');
  res.send(png);
});

router.get('/:guestId', async (req, res) => {
  const guest = await Guest.findById(req.params.guestId);
  if (!guest) return res.status(404).json({ error: 'Guest not found' });

  const displayName = guest.envelopeName || `${guest.firstName} ${guest.lastName}`.trim();
  const qrBuffer = await qrPngBuffer(guest.qrToken);
  const png = await renderInvitePng({ displayName, qrBuffer });
  guest.inviteGeneratedAt = new Date();
  await guest.save();
  res.set('Content-Type', 'image/png');
  res.set('Content-Disposition', `attachment; filename="${fileNameFor(guest)}"`);
  res.send(png);
});

router.post('/batch', async (req, res) => {
  const { guestIds, all } = req.body ?? {};
  const filter = all ? {} : { _id: { $in: guestIds ?? [] } };
  const guests = await Guest.find(filter);
  if (guests.length === 0) return res.status(400).json({ error: 'No matching guests' });

  res.set('Content-Type', 'application/zip');
  res.set('Content-Disposition', 'attachment; filename="invites.zip"');
  const archive = archiver('zip');
  archive.pipe(res);

  const errors = [];
  for (const guest of guests) {
    try {
      const displayName = guest.envelopeName || `${guest.firstName} ${guest.lastName}`.trim();
      const qrBuffer = await qrPngBuffer(guest.qrToken);
      const png = await renderInvitePng({ displayName, qrBuffer });
      guest.inviteGeneratedAt = new Date();
      await guest.save();
      archive.append(png, { name: fileNameFor(guest) });
    } catch (err) {
      errors.push(`${guest.firstName} ${guest.lastName}: ${err.message}`);
    }
  }
  if (errors.length > 0) {
    archive.append(errors.join('\n'), { name: '_errors.txt' });
  }
  await archive.finalize();
});

export default router;
