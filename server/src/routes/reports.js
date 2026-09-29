import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createReport } from '../controllers/reportController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { message: 'You have sent a lot of reports. Try again later.' },
});

router.post('/', requireAuth, limiter, createReport);

export default router;
