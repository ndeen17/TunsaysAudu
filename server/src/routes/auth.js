import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signSession, setSessionCookie, clearSessionCookie, requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = await User.findOne({ username: username.toLowerCase().trim() });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  setSessionCookie(res, signSession(user));
  res.json({ role: user.role, username: user.username });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id, 'username role');
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ role: user.role, username: user.username });
});

export default router;
