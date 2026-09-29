import { Router } from 'express';
import {
  analytics, deleteAnyPost, deleteUser, exportCsv, listPosts, listReports, listUsers, reportCount, resolveReport, setBanned,
} from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

// Every admin route needs a valid session AND the admin role, checked on the server on each request.
router.use(requireAuth, requireAdmin);
router.get('/analytics', analytics);
router.get('/users', listUsers);
router.patch('/users/:id', setBanned);
router.delete('/users/:id', deleteUser);
router.get('/posts', listPosts);
router.delete('/posts/:id', deleteAnyPost);
router.get('/reports/count', reportCount);
router.get('/reports', listReports);
router.patch('/reports/:id', resolveReport);
router.get('/export/:type', exportCsv);

export default router;
