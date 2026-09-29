import { Router } from 'express';
import { deleteAnyPost, deleteUser, listPosts, listUsers, setBanned, stats } from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

// Every admin route needs a valid session AND the admin role, checked on the server on each request.
router.use(requireAuth, requireAdmin);
router.get('/stats', stats);
router.get('/users', listUsers);
router.patch('/users/:id', setBanned);
router.delete('/users/:id', deleteUser);
router.get('/posts', listPosts);
router.delete('/posts/:id', deleteAnyPost);

export default router;
