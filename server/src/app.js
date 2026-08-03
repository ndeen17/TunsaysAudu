import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import importRoutes from './routes/import.js';
import guestRoutes from './routes/guests.js';
import inviteRoutes from './routes/invites.js';
import checkinRoutes from './routes/checkin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/auth', authRoutes);
  app.use('/api/import', importRoutes);
  app.use('/api/guests', guestRoutes);
  app.use('/api/invites', inviteRoutes);
  app.use('/api/checkin', checkinRoutes);

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // In production the client is built and served from this same process —
  // keeps the app to a single deploy target with no CORS to manage.
  const clientDist = path.join(__dirname, '../../client/dist');
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
