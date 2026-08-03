import { Router } from 'express';
import Guest from '../models/Guest.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Security staff only ever see what they need at the door: name + table/seat
// + check-in state. Organizers see everything (email, name).
const SECURITY_FIELDS = 'firstName lastName table seat checkedIn checkinEvents qrToken';

router.get('/', async (req, res) => {
  const { q, checkedIn } = req.query;
  const filter = {};
  if (q) {
    const re = new RegExp(escapeRegex(String(q)), 'i');
    filter.$or = [{ firstName: re }, { lastName: re }, { envelopeName: re }];
  }
  if (checkedIn === 'true') filter.checkedIn = true;
  if (checkedIn === 'false') filter.checkedIn = false;

  const projection = req.user.role === 'security' ? SECURITY_FIELDS : null;
  const guests = await Guest.find(filter, projection).sort({ firstName: 1, lastName: 1 }).limit(500).lean();
  res.json(guests);
});

router.get('/stats', async (req, res) => {
  const [total, checkedIn] = await Promise.all([
    Guest.countDocuments({}),
    Guest.countDocuments({ checkedIn: true }),
  ]);
  res.json({ total, checkedIn });
});

router.patch('/:id', requireRole('organizer'), async (req, res) => {
  const { table, seat, firstName, lastName } = req.body ?? {};
  const update = {};
  if (table !== undefined) update.table = table;
  if (seat !== undefined) update.seat = seat;
  if (firstName !== undefined) update.firstName = firstName;
  if (lastName !== undefined) update.lastName = lastName;

  const guest = await Guest.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!guest) return res.status(404).json({ error: 'Guest not found' });
  res.json(guest);
});

export default router;
