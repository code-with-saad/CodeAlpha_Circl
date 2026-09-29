import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  addComment, createPost, deleteComment, deletePost, getPost, listComments, listFeed, listSaved, reshare, setLike, setSaved, trending, unreshare,
} from '../controllers/postController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const writeLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

router.use(requireAuth);
router.get('/', listFeed);
router.post('/', writeLimiter, createPost);
router.get('/saved', listSaved);
router.get('/trending', trending);
router.post('/:id/reshare', writeLimiter, reshare);
router.delete('/:id/reshare', unreshare);
router.get('/:id', getPost);
router.post('/:id/like', writeLimiter, setLike);
router.delete('/:id/like', setLike);
router.post('/:id/save', writeLimiter, setSaved);
router.delete('/:id/save', setSaved);
router.delete('/:id', deletePost);
router.get('/:id/comments', listComments);
router.post('/:id/comments', writeLimiter, addComment);

export const commentRouter = Router();
commentRouter.delete('/:id', requireAuth, deleteComment);

export default router;
