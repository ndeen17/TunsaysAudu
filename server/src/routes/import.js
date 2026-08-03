import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  parseGuestRows,
  buildImportPlan,
  applyImportPlan,
  stashPendingImport,
  takePendingImport,
} from '../services/excelImport.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.use(requireAuth, requireRole('organizer'));

router.post('/preview', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const rows = await parseGuestRows(req.file.buffer, req.file.originalname);
    const { plan, summary, total } = await buildImportPlan(rows);
    const importId = stashPendingImport(plan);
    res.json({ importId, summary, total, sample: rows.slice(0, 10) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/commit', async (req, res) => {
  const { importId } = req.body ?? {};
  const plan = takePendingImport(importId);
  if (!plan) return res.status(400).json({ error: 'Import preview expired — please re-upload the file' });

  const result = await applyImportPlan(plan);
  res.json(result);
});

export default router;
