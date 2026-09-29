import mongoose from 'mongoose';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import { removePostCascade } from './postController.js';
import { purgeUser } from '../utils/purge.js';
import { AUTHOR_FIELDS, authorJSON } from '../utils/serialize.js';

const PAGE = 20;
const validId = (id) => typeof id === 'string' && mongoose.isValidObjectId(id);
const bad = (res, message, status = 400) => res.status(status).json({ message });
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function stats(_req, res) {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [users, admins, banned, posts, comments, newUsers, newPosts] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ banned: true }),
    Post.countDocuments(),
    Comment.countDocuments(),
    User.countDocuments({ createdAt: { $gte: dayAgo } }),
    Post.countDocuments({ createdAt: { $gte: dayAgo } }),
  ]);
  res.json({ users, admins, banned, posts, comments, newUsers24h: newUsers, newPosts24h: newPosts });
}

const userRow = (u) => ({
  id: u._id, username: u.username, displayName: u.displayName || u.username, email: u.email, avatar: u.avatar,
  role: u.role, banned: u.banned, followersCount: u.followers.length, createdAt: u.createdAt,
});

export async function listUsers(req, res) {
  const { cursor } = req.query;
  if (cursor !== undefined && !validId(cursor)) return bad(res, 'Invalid cursor');
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 40) : '';

  const filter = {};
  if (q) {
    const re = new RegExp(escapeRe(q), 'i');
    filter.$or = [{ username: re }, { displayName: re }, { email: re }];
  }
  if (cursor) filter._id = { $lt: cursor };

  const rows = await User.find(filter).sort({ _id: -1 }).limit(PAGE + 1);
  const items = rows.slice(0, PAGE);
  res.json({ users: items.map(userRow), nextCursor: rows.length > PAGE ? String(items[items.length - 1]._id) : null });
}

async function targetUser(req, res) {
  if (!validId(req.params.id)) { bad(res, 'User not found', 404); return null; }
  const user = await User.findById(req.params.id);
  if (!user) { bad(res, 'User not found', 404); return null; }
  if (user.role === 'admin') { bad(res, 'Admin accounts cannot be changed here', 403); return null; }
  return user;
}

export async function setBanned(req, res) {
  const user = await targetUser(req, res);
  if (!user) return;
  if (typeof req.body.banned !== 'boolean') return bad(res, 'banned must be true or false');
  user.banned = req.body.banned;
  await user.save();
  res.json({ user: userRow(user) });
}

export async function deleteUser(req, res) {
  const user = await targetUser(req, res);
  if (!user) return;

  await purgeUser(user);
  res.json({ ok: true });
}

export async function listPosts(req, res) {
  const { cursor } = req.query;
  if (cursor !== undefined && !validId(cursor)) return bad(res, 'Invalid cursor');
  const rows = await Post.find(cursor ? { _id: { $lt: cursor } } : {}).sort({ _id: -1 }).limit(PAGE + 1).populate('author', AUTHOR_FIELDS);
  const items = rows.slice(0, PAGE);
  res.json({
    posts: items.map((p) => ({
      id: p._id, text: p.text, image: p.image, isRepost: !!p.repostOf, author: authorJSON(p.author),
      likesCount: p.likes.length, commentsCount: p.commentsCount, createdAt: p.createdAt,
    })),
    nextCursor: rows.length > PAGE ? String(items[items.length - 1]._id) : null,
  });
}

export async function deleteAnyPost(req, res) {
  if (!validId(req.params.id)) return bad(res, 'Post not found', 404);
  const post = await Post.findById(req.params.id);
  if (!post) return bad(res, 'Post not found', 404);
  await removePostCascade(post);
  res.json({ ok: true });
}
