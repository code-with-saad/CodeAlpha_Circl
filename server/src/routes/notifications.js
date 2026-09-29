import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { list, markAllRead, unreadCount } from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
// Generous enough for a 10s poll from a few tabs, tight enough to stop abuse.
const pollLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });

router.use(requireAuth);
router.get('/unread-count', pollLimiter, unreadCount);
router.get('/', list);
router.post('/read', markAllRead);

export default router;
