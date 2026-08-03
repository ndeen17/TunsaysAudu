import { Router } from 'express';
import multer from 'multer';
import archiver from 'archiver';
import sharp from 'sharp';
import Guest from '../models/Guest.js';
import Asset from '../models/Asset.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { renderInvitePng } from '../services/inviteRenderer.js';
import { qrPngBuffer, generateQrToken } from '../services/qr.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const router = Router();
router.use(requireAuth, requireRole('organizer'));

const BACKGROUND_KEY = 'invite-background';

function fileNameFor(guest) {
  const base = `${guest.firstName}_${guest.lastName}`.trim().replace(/[^a-z0-9_-]+/gi, '_');
  return `${base || guest._id}.png`;
}

async function loadBackground() {
  const background = await Asset.findOne({ key: BACKGROUND_KEY });
  if (!background) {
    const err = new Error('Upload an invite background before generating invites');
    err.status = 409;
    throw err;
  }
  return background;
}

router.get('/design', async (req, res) => {
  const background = await Asset.findOne({ key: BACKGROUND_KEY }, 'width height updatedAt');
  res.json({ background });
});

router.post('/background', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const meta = await sharp(req.file.buffer).metadata();
  const asset = await Asset.findOneAndUpdate(
    { key: BACKGROUND_KEY },
    { key: BACKGROUND_KEY, mimeType: req.file.mimetype, data: req.file.buffer, width: meta.width, height: meta.height },
    { upsert: true, new: true, projection: 'width height updatedAt' }
  );
  res.json(asset);
});

router.get('/background', async (req, res) => {
  const asset = await Asset.findOne({ key: BACKGROUND_KEY });
  if (!asset) return res.status(404).json({ error: 'No background uploaded yet' });
  res.set('Content-Type', asset.mimeType);
  res.send(asset.data);
});

router.get('/preview', async (req, res) => {
  try {
    const background = await loadBackground();
    const qrBuffer = await qrPngBuffer(generateQrToken());
    const png = await renderInvitePng({ backgroundBuffer: background.data, displayName: 'Jane Doe', qrBuffer });
    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/:guestId', async (req, res) => {
  const guest = await Guest.findById(req.params.guestId);
  if (!guest) return res.status(404).json({ error: 'Guest not found' });

  try {
    const background = await loadBackground();
    const displayName = guest.envelopeName || `${guest.firstName} ${guest.lastName}`.trim();
    const qrBuffer = await qrPngBuffer(guest.qrToken);
    const png = await renderInvitePng({ backgroundBuffer: background.data, displayName, qrBuffer });
    guest.inviteGeneratedAt = new Date();
    await guest.save();
    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `attachment; filename="${fileNameFor(guest)}"`);
    res.send(png);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/batch', async (req, res) => {
  const { guestIds, all } = req.body ?? {};
  const filter = all ? {} : { _id: { $in: guestIds ?? [] } };
  const guests = await Guest.find(filter);
  if (guests.length === 0) return res.status(400).json({ error: 'No matching guests' });

  let background;
  try {
    background = await loadBackground();
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }

  res.set('Content-Type', 'application/zip');
  res.set('Content-Disposition', 'attachment; filename="invites.zip"');
  const archive = archiver('zip');
  archive.pipe(res);

  const errors = [];
  for (const guest of guests) {
    try {
      const displayName = guest.envelopeName || `${guest.firstName} ${guest.lastName}`.trim();
      const qrBuffer = await qrPngBuffer(guest.qrToken);
      const png = await renderInvitePng({ backgroundBuffer: background.data, displayName, qrBuffer });
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
