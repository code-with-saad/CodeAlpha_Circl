import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import Post from '../models/Post.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { removePostCascade } from '../controllers/postController.js';

// Removes a person and everything that points at them. Used by account deletion and the admin panel.
export async function purgeUser(user) {
  const posts = await Post.find({ author: user._id }).select('_id repostOf');
  for (const p of posts) await removePostCascade(p);

  // Comments on other people's posts: keep those posts' counters accurate.
  const mine = await Comment.find({ author: user._id }).select('post').lean();
  const perPost = new Map();
  mine.forEach((c) => perPost.set(String(c.post), (perPost.get(String(c.post)) || 0) + 1));
  if (perPost.size) {
    await Post.bulkWrite([...perPost].map(([id, n]) => ({ updateOne: { filter: { _id: id }, update: { $inc: { commentsCount: -n } } } })));
  }

  await Promise.all([
    Comment.deleteMany({ author: user._id }),
    Notification.deleteMany({ $or: [{ actor: user._id }, { recipient: user._id }] }),
    Report.deleteMany({ reporter: user._id }),
    Report.updateMany({ user: user._id, status: 'open' }, { status: 'actioned', resolution: 'Account deleted', resolvedAt: new Date() }),
    User.updateMany({ following: user._id }, { $pull: { following: user._id } }),
    User.updateMany({ followers: user._id }, { $pull: { followers: user._id } }),
    Post.updateMany({ likes: user._id }, { $pull: { likes: user._id } }),
  ]);
  await user.deleteOne();
}
