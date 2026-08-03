import { Router } from 'express';
import Guest from '../models/Guest.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('organizer', 'security'));

function guestSummary(guest) {
  return { id: guest._id, firstName: guest.firstName, lastName: guest.lastName, table: guest.table, seat: guest.seat };
}

router.post('/scan', async (req, res) => {
  const { token, override } = req.body ?? {};
  if (!token) return res.status(400).json({ error: 'token is required' });

  const guest = await Guest.findOne({ qrToken: token });
  if (!guest) return res.status(404).json({ status: 'invalid' });

  if (!guest.checkedIn) {
    guest.checkedIn = true;
    guest.checkinEvents.push({ at: new Date(), by: req.user.id, overridden: false });
    await guest.save();
    return res.json({ status: 'checked_in', guest: guestSummary(guest) });
  }

  if (!override) {
    return res.json({
      status: 'duplicate',
      guest: guestSummary(guest),
      firstCheckedInAt: guest.checkinEvents[0]?.at,
      checkinCount: guest.checkinEvents.length,
    });
  }

  guest.checkinEvents.push({ at: new Date(), by: req.user.id, overridden: true });
  await guest.save();
  res.json({ status: 'checked_in_override', guest: guestSummary(guest), checkinCount: guest.checkinEvents.length });
});

router.get('/lookup', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const re = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const guests = await Guest.find({ $or: [{ firstName: re }, { lastName: re }] }, 'firstName lastName table seat checkedIn qrToken')
    .limit(10)
    .lean();
  res.json(guests);
});

export default router;
