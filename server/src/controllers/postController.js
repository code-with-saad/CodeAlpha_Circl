import mongoose from 'mongoose';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';
import { isOwnImage } from '../utils/cloudinary.js';
import { extractTags, TAG_NAME_RE } from '../utils/tags.js';
import Notification from '../models/Notification.js';
import { notify, unnotify } from '../utils/notify.js';
import { AUTHOR_FIELDS, POST_POPULATE, commentJSON, postJSON } from '../utils/serialize.js';

const PAGE = 15;
const TRENDING_WINDOW_MS = 48 * 60 * 60 * 1000;
const validId = (id) => typeof id === 'string' && mongoose.isValidObjectId(id);
const bad = (res, message, status = 400) => res.status(status).json({ message });

// Adds the per-viewer "did I reshare this" flag with one extra query per page.
export async function shape(rows, viewer) {
  const ids = rows.flatMap((p) => (p.repostOf ? [p._id, p.repostOf._id] : [p._id]));
  const mine = await Post.find({ author: viewer._id, repostOf: { $in: ids } }).select('repostOf').lean();
  const resharedIds = new Set(mine.map((m) => String(m.repostOf)));
  return rows.map((p) => postJSON(p, viewer, resharedIds));
}

// Cursor pagination on _id: stable while new posts arrive, unlike skip/offset.
async function page(filter, req, res) {
  const { cursor } = req.query;
  if (cursor !== undefined && !validId(cursor)) return bad(res, 'Invalid cursor');
  const query = cursor ? { ...filter, _id: { ...(filter._id || {}), $lt: cursor } } : filter;

  const rows = await Post.find(query).sort({ _id: -1 }).limit(PAGE + 1).populate(POST_POPULATE);
  const hasMore = rows.length > PAGE;
  const items = rows.slice(0, PAGE);
  res.json({
    posts: await shape(items, req.user),
    nextCursor: hasMore ? String(items[items.length - 1]._id) : null,
  });
}

async function loadOne(id, viewer) {
  const post = await Post.findById(id).populate(POST_POPULATE);
  return post ? (await shape([post], viewer))[0] : null;
}

export async function createPost(req, res) {
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  const image = req.body.image || '';
  if (text.length > 500) return bad(res, 'Posts are limited to 500 characters');
  if (image && !isOwnImage(image)) return bad(res, 'Invalid image');
  if (!text && !image) return bad(res, 'Write something or add a photo');

  const post = await Post.create({ author: req.user._id, text, image, tags: extractTags(text) });
  res.status(201).json({ post: await loadOne(post._id, req.user) });
}

export async function listFeed(req, res) {
  const { feed, tag } = req.query;
  if (tag !== undefined) {
    const t = typeof tag === 'string' ? tag.toLowerCase() : '';
    if (!TAG_NAME_RE.test(t)) return bad(res, 'Invalid tag');
    return page({ tags: t }, req, res);
  }
  if (feed === 'following') return page({ author: { $in: [...req.user.following, req.user._id] } }, req, res);
  return page({}, req, res);
}

export async function listUserPosts(req, res) {
  const user = await User.findOne({ username: String(req.params.username).toLowerCase() }).select('_id');
  if (!user) return bad(res, 'User not found', 404);
  return page({ author: user._id }, req, res);
}

export async function getPost(req, res) {
  if (!validId(req.params.id)) return bad(res, 'Post not found', 404);
  const post = await loadOne(req.params.id, req.user);
  if (!post) return bad(res, 'Post not found', 404);
  res.json({ post });
}

// Shared by the owner's delete and the admin delete: removes the post, its comments and any reshares of it.
export async function removePostCascade(post) {
  const reposts = await Post.find({ repostOf: post._id }).select('_id');
  const ids = [post._id, ...reposts.map((r) => r._id)];
  await Promise.all([
    Post.deleteMany({ _id: { $in: ids } }),
    Comment.deleteMany({ post: { $in: ids } }),
    Notification.deleteMany({ post: { $in: ids } }),
    User.updateMany({ saved: { $in: ids } }, { $pull: { saved: { $in: ids } } }),
    // If this post was itself a reshare, the original's counter goes down.
    post.repostOf ? Post.updateOne({ _id: post.repostOf, repostsCount: { $gt: 0 } }, { $inc: { repostsCount: -1 } }) : null,
  ]);
}

export async function deletePost(req, res) {
  if (!validId(req.params.id)) return bad(res, 'Post not found', 404);
  const post = await Post.findById(req.params.id);
  if (!post) return bad(res, 'Post not found', 404);
  if (String(post.author) !== String(req.user._id)) return bad(res, 'You can only delete your own posts', 403);
  await removePostCascade(post);
  res.json({ ok: true });
}

export async function listComments(req, res) {
  if (!validId(req.params.id)) return bad(res, 'Post not found', 404);
  const comments = await Comment.find({ post: req.params.id }).sort({ _id: 1 }).limit(200).populate('author', AUTHOR_FIELDS);
  res.json({ comments: comments.map(commentJSON) });
}

export async function addComment(req, res) {
  if (!validId(req.params.id)) return bad(res, 'Post not found', 404);
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > 300) return bad(res, 'Comments are 1 to 300 characters');

  const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { commentsCount: 1 } });
  if (!post) return bad(res, 'Post not found', 404);

  const comment = await Comment.create({ post: post._id, author: req.user._id, text });
  await notify({ recipient: post.author, actor: req.user._id, type: 'comment', post: post._id, text });
  await comment.populate('author', AUTHOR_FIELDS);
  res.status(201).json({ comment: commentJSON(comment) });
}

export async function deleteComment(req, res) {
  if (!validId(req.params.id)) return bad(res, 'Comment not found', 404);
  const comment = await Comment.findById(req.params.id);
  if (!comment) return bad(res, 'Comment not found', 404);

  const post = await Post.findById(comment.post).select('author');
  const mine = String(comment.author) === String(req.user._id);
  const myPost = post && String(post.author) === String(req.user._id);
  if (!mine && !myPost) return bad(res, 'Not allowed', 403);

  await comment.deleteOne();
  if (post) await Post.updateOne({ _id: post._id, commentsCount: { $gt: 0 } }, { $inc: { commentsCount: -1 } });
  res.json({ ok: true });
}

// Likes and saves are idempotent: $addToSet / $pull make repeats harmless.
export async function setLike(req, res) {
  if (!validId(req.params.id)) return bad(res, 'Post not found', 404);
  const on = req.method === 'POST';
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    on ? { $addToSet: { likes: req.user._id } } : { $pull: { likes: req.user._id } },
    { new: true }
  ).select('likes author');
  if (!post) return bad(res, 'Post not found', 404);
  const change = { recipient: post.author, actor: req.user._id, type: 'like', post: post._id };
  if (on) await notify(change);
  else await unnotify(change);
  res.json({ liked: on, likesCount: post.likes.length });
}

export async function setSaved(req, res) {
  if (!validId(req.params.id)) return bad(res, 'Post not found', 404);
  const on = req.method === 'POST';
  if (on && !(await Post.exists({ _id: req.params.id }))) return bad(res, 'Post not found', 404);
  await User.updateOne(
    { _id: req.user._id },
    on ? { $addToSet: { saved: req.params.id } } : { $pull: { saved: req.params.id } }
  );
  res.json({ saved: on });
}

export async function listSaved(req, res) {
  return page({ _id: { $in: req.user.saved } }, req, res);
}

// Reshare = plain repost (no text) or quote (with text). Resharing a reshare targets the original.
export async function reshare(req, res) {
  if (!validId(req.params.id)) return bad(res, 'Post not found', 404);
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (text.length > 500) return bad(res, 'Quotes are limited to 500 characters');

  let target = await Post.findById(req.params.id);
  if (!target) return bad(res, 'Post not found', 404);
  if (target.repostOf) target = await Post.findById(target.repostOf);
  if (!target) return bad(res, 'Post not found', 404);

  if (!text) {
    const existing = await Post.findOne({ author: req.user._id, repostOf: target._id, text: '' }).select('_id');
    if (existing) return res.json({ reshared: true, repostsCount: target.repostsCount });
  }

  await Post.create({ author: req.user._id, repostOf: target._id, text, tags: extractTags(text) });
  await notify({ recipient: target.author, actor: req.user._id, type: text ? 'quote' : 'reshare', post: target._id, text });
  const updated = await Post.findByIdAndUpdate(target._id, { $inc: { repostsCount: 1 } }, { new: true }).select('repostsCount');
  res.status(201).json({ reshared: true, repostsCount: updated.repostsCount });
}

export async function unreshare(req, res) {
  if (!validId(req.params.id)) return bad(res, 'Post not found', 404);
  let target = await Post.findById(req.params.id).select('repostOf');
  if (!target) return bad(res, 'Post not found', 404);
  const originalId = target.repostOf || target._id;

  const mine = await Post.find({ author: req.user._id, repostOf: originalId }).select('_id');
  if (mine.length) {
    const ids = mine.map((m) => m._id);
    await Promise.all([
      Post.deleteMany({ _id: { $in: ids } }),
      Comment.deleteMany({ post: { $in: ids } }),
      Post.updateOne(
        { _id: originalId },
        [{ $set: { repostsCount: { $max: [0, { $subtract: ['$repostsCount', mine.length] }] } } }],
        { updatePipeline: true }
      ),
    ]);
  }
  const original = await Post.findById(originalId).select('repostsCount');
  res.json({ reshared: false, repostsCount: original?.repostsCount || 0 });
}

// Tags ranked by (2 x posts + likes) over the last 48 hours.
export async function trending(_req, res) {
  const since = new Date(Date.now() - TRENDING_WINDOW_MS);
  const tags = await Post.aggregate([
    { $match: { createdAt: { $gte: since }, tags: { $exists: true, $ne: [] } } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', posts: { $sum: 1 }, likes: { $sum: { $size: '$likes' } } } },
    { $addFields: { score: { $add: [{ $multiply: ['$posts', 2] }, '$likes'] } } },
    { $sort: { score: -1, _id: 1 } },
    { $limit: 8 },
  ]);
  res.json({ tags: tags.map((t) => ({ tag: t._id, posts: t.posts })) });
}
