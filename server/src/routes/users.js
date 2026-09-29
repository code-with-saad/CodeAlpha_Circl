import { Router } from 'express';
import { changePassword, deleteAccount, getProfile, search, suggested, listFollowers, listFollowing, setFollow, updateMe } from '../controllers/userController.js';
import { listUserPosts } from '../controllers/postController.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.patch('/me', updateMe);
router.patch('/me/password', authLimiter, changePassword);
router.delete('/me', authLimiter, deleteAccount);
router.get('/suggested', suggested);
router.get('/search', search);
router.get('/:username/posts', listUserPosts);
router.get('/:username/followers', listFollowers);
router.get('/:username/following', listFollowing);
router.post('/:username/follow', setFollow);
router.delete('/:username/follow', setFollow);
router.get('/:username', getProfile);

export default router;
