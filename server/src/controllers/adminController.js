import mongoose from 'mongoose';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Report from '../models/Report.js';
import AdminLog from '../models/AdminLog.js';
import { removePostCascade } from './postController.js';
import { purgeUser } from '../utils/purge.js';
import { AUTHOR_FIELDS, authorJSON } from '../utils/serialize.js';

const PAGE = 20;
const DAY = 24 * 60 * 60 * 1000;
const validId = (id) => typeof id === 'string' && mongoose.isValidObjectId(id);
const bad = (res, message, status = 400) => res.status(status).json({ message });
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isRepost = { $ne: [{ $ifNull: ['$repostOf', null] }, null] };

// Every moderation action leaves a line in the audit trail shown on the dashboard.
const record = (admin, action, target = '') => AdminLog.create({ admin: admin._id, action, target }).catch(() => {});

const snippet = (t, n = 60) => (t ? (t.length > n ? `${t.slice(0, n)}...` : t) : '(photo)');

/* ------------------------------------------------------------------ analytics */

const change = (value, previous) => ({
  value,
  previous,
  // null means "no baseline to compare against" (previous period had none).
  change: previous === 0 ? (value === 0 ? 0 : null) : Math.round(((value - previous) / previous) * 100),
});

export async function analytics(req, res) {
  const days = [7, 30, 90].includes(Number(req.query.range)) ? Number(req.query.range) : 30;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - (days - 1) * DAY);
  const prevStart = new Date(start.getTime() - days * DAY);
  const since24 = new Date(Date.now() - DAY);
  const since7 = new Date(Date.now() - 7 * DAY);
  const dayKey = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } };
  const inRange = { createdAt: { $gte: start } };
  const prevRange = { createdAt: { $gte: prevStart, $lt: start } };

  const [
    signupRows, postRows, commentRows,
    prevUsers, prevPosts, prevComments, prevReshares,
    users, admins, banned, posts, reshares, comments, likeRows, openReports,
    posters24, commenters24, posters7, commenters7,
    mixRows, tagRows, topPostRows, topAuthorRows, recent, activity,
  ] = await Promise.all([
    User.aggregate([{ $match: inRange }, { $group: { _id: dayKey, n: { $sum: 1 } } }]),
    Post.aggregate([{ $match: inRange }, { $group: { _id: { d: dayKey, r: { $cond: [isRepost, 1, 0] } }, n: { $sum: 1 } } }]),
    Comment.aggregate([{ $match: inRange }, { $group: { _id: dayKey, n: { $sum: 1 } } }]),
    User.countDocuments(prevRange),
    Post.countDocuments({ ...prevRange, repostOf: null }),
    Comment.countDocuments(prevRange),
    Post.countDocuments({ ...prevRange, repostOf: { $ne: null } }),
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ banned: true }),
    Post.countDocuments({ repostOf: null }),
    Post.countDocuments({ repostOf: { $ne: null } }),
    Comment.countDocuments(),
    Post.aggregate([{ $group: { _id: null, n: { $sum: { $size: '$likes' } } } }]),
    Report.countDocuments({ status: 'open' }),
    Post.distinct('author', { createdAt: { $gte: since24 } }),
    Comment.distinct('author', { createdAt: { $gte: since24 } }),
    Post.distinct('author', { createdAt: { $gte: since7 } }),
    Comment.distinct('author', { createdAt: { $gte: since7 } }),
    Post.aggregate([
      { $match: inRange },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $and: [isRepost, { $ne: ['$text', ''] }] }, then: 'quote' },
                { case: isRepost, then: 'reshare' },
                { case: { $ne: ['$image', ''] }, then: 'photo' },
              ],
              default: 'text',
            },
          },
          n: { $sum: 1 },
        },
      },
    ]),
    Post.aggregate([
      { $match: { ...inRange, tags: { $exists: true, $ne: [] } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', posts: { $sum: 1 } } },
      { $sort: { posts: -1, _id: 1 } },
      { $limit: 8 },
    ]),
    Post.aggregate([
      { $match: { ...inRange, repostOf: null } },
      { $addFields: { likesN: { $size: '$likes' } } },
      { $addFields: { score: { $add: ['$likesN', { $multiply: ['$commentsCount', 2] }, { $multiply: [{ $ifNull: ['$repostsCount', 0] }, 3] }] } } },
      { $match: { score: { $gt: 0 } } },
      { $sort: { score: -1, _id: -1 } },
      { $limit: 5 },
      { $project: { text: 1, image: 1, author: 1, likesN: 1, commentsCount: 1, repostsCount: 1, score: 1 } },
    ]),
    Post.aggregate([
      { $match: { ...inRange, repostOf: null } },
      { $group: { _id: '$author', posts: { $sum: 1 }, likes: { $sum: { $size: '$likes' } } } },
      { $sort: { posts: -1, likes: -1 } },
      { $limit: 5 },
    ]),
    User.find().sort({ _id: -1 }).limit(5).select('username displayName avatar createdAt'),
    AdminLog.find().sort({ _id: -1 }).limit(8).populate('admin', 'username'),
  ]);

  const authors = await User.find({ _id: { $in: [...topPostRows.map((p) => p.author), ...topAuthorRows.map((a) => a._id)] } }).select(AUTHOR_FIELDS);
  const byId = new Map(authors.map((u) => [String(u._id), u]));
  const who = (id) => (byId.get(String(id)) ? authorJSON(byId.get(String(id))) : null);

  const labels = Array.from({ length: days }, (_, i) => new Date(start.getTime() + i * DAY).toISOString().slice(0, 10));
  const fill = (rows, pick = () => true) => {
    const m = new Map();
    rows.filter(pick).forEach((r) => m.set(r._id.d ?? r._id, (m.get(r._id.d ?? r._id) || 0) + r.n));
    return labels.map((l) => m.get(l) || 0);
  };
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const series = {
    labels,
    signups: fill(signupRows),
    posts: fill(postRows, (r) => r._id.r === 0),
    reshares: fill(postRows, (r) => r._id.r === 1),
    comments: fill(commentRows),
  };
  const mix = { text: 0, photo: 0, reshare: 0, quote: 0 };
  mixRows.forEach((r) => { mix[r._id] = r.n; });

  const unique = (...lists) => new Set(lists.flat().map(String)).size;

  res.json({
    range: days,
    totals: { users, admins, banned, posts, reshares, comments, likes: likeRows[0]?.n || 0, openReports },
    period: {
      signups: change(sum(series.signups), prevUsers),
      posts: change(sum(series.posts), prevPosts),
      comments: change(sum(series.comments), prevComments),
      reshares: change(sum(series.reshares), prevReshares),
    },
    active: { day: unique(posters24, commenters24), week: unique(posters7, commenters7) },
    series,
    mix,
    tags: tagRows.map((t) => ({ tag: t._id, posts: t.posts })),
    topPosts: topPostRows.map((p) => ({
      id: p._id, text: p.text, hasImage: !!p.image, author: who(p.author),
      likes: p.likesN, comments: p.commentsCount, reshares: p.repostsCount || 0,
    })),
    topAuthors: topAuthorRows.map((a) => ({ author: who(a._id), posts: a.posts, likes: a.likes })).filter((a) => a.author),
    recentSignups: recent.map((u) => ({ ...authorJSON(u), createdAt: u.createdAt })),
    activity: activity.map((a) => ({ id: a._id, admin: a.admin?.username || 'unknown', action: a.action, target: a.target, createdAt: a.createdAt })),
  });
}

/* --------------------------------------------------------------------- people */

const userRow = (u, postsCount = 0) => ({
  id: u._id, username: u.username, displayName: u.displayName || u.username, email: u.email, avatar: u.avatar,
  role: u.role, banned: u.banned, followersCount: u.followers.length, postsCount, createdAt: u.createdAt,
});

export async function listUsers(req, res) {
  const { cursor, status, role } = req.query;
  if (cursor !== undefined && !validId(cursor)) return bad(res, 'Invalid cursor');
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 40) : '';

  const filter = {};
  if (q) {
    const re = new RegExp(escapeRe(q), 'i');
    filter.$or = [{ username: re }, { displayName: re }, { email: re }];
  }
  if (status === 'suspended') filter.banned = true;
  if (status === 'active') filter.banned = false;
  if (role === 'admin' || role === 'user') filter.role = role;
  if (cursor) filter._id = { $lt: cursor };

  const rows = await User.find(filter).sort({ _id: -1 }).limit(PAGE + 1);
  const items = rows.slice(0, PAGE);
  const counts = await Post.aggregate([
    { $match: { author: { $in: items.map((u) => u._id) }, repostOf: null } },
    { $group: { _id: '$author', n: { $sum: 1 } } },
  ]);
  const perUser = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json({
    users: items.map((u) => userRow(u, perUser.get(String(u._id)) || 0)),
    nextCursor: rows.length > PAGE ? String(items[items.length - 1]._id) : null,
  });
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
  await record(req.user, user.banned ? 'Suspended' : 'Restored', `@${user.username}`);
  res.json({ user: userRow(user) });
}

export async function deleteUser(req, res) {
  const user = await targetUser(req, res);
  if (!user) return;
  const label = `@${user.username}`;
  await purgeUser(user);
  await record(req.user, 'Deleted account', label);
  res.json({ ok: true });
}

/* -------------------------------------------------------------------- content */

export async function listPosts(req, res) {
  const { cursor, type } = req.query;
  if (cursor !== undefined && !validId(cursor)) return bad(res, 'Invalid cursor');
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : '';

  const filter = {};
  if (q) filter.text = new RegExp(escapeRe(q), 'i');
  if (type === 'photo') filter.image = { $ne: '' };
  if (type === 'reshare') filter.repostOf = { $ne: null };
  if (type === 'text') Object.assign(filter, { image: '', repostOf: null });
  if (cursor) filter._id = { $lt: cursor };

  const rows = await Post.find(filter).sort({ _id: -1 }).limit(PAGE + 1).populate('author', AUTHOR_FIELDS);
  const items = rows.slice(0, PAGE);
  const flagged = await Report.aggregate([
    { $match: { status: 'open', post: { $in: items.map((p) => p._id) } } },
    { $group: { _id: '$post', n: { $sum: 1 } } },
  ]);
  const reports = new Map(flagged.map((f) => [String(f._id), f.n]));
  res.json({
    posts: items.map((p) => ({
      id: p._id, text: p.text, image: p.image, isRepost: !!p.repostOf, author: authorJSON(p.author),
      likesCount: p.likes.length, commentsCount: p.commentsCount, reportsCount: reports.get(String(p._id)) || 0, createdAt: p.createdAt,
    })),
    nextCursor: rows.length > PAGE ? String(items[items.length - 1]._id) : null,
  });
}

export async function deleteAnyPost(req, res) {
  if (!validId(req.params.id)) return bad(res, 'Post not found', 404);
  const post = await Post.findById(req.params.id).populate('author', 'username');
  if (!post) return bad(res, 'Post not found', 404);
  const label = `post by @${post.author?.username || 'unknown'}: ${snippet(post.text, 40)}`;
  await removePostCascade(post);
  await record(req.user, 'Deleted post', label);
  res.json({ ok: true });
}

/* -------------------------------------------------------------------- reports */

export async function reportCount(_req, res) {
  res.json({ open: await Report.countDocuments({ status: 'open' }) });
}

export async function listReports(req, res) {
  const { cursor } = req.query;
  const status = ['open', 'actioned', 'dismissed'].includes(req.query.status) ? req.query.status : null;
  if (cursor !== undefined && !validId(cursor)) return bad(res, 'Invalid cursor');

  const filter = { ...(status ? { status } : {}), ...(cursor ? { _id: { $lt: cursor } } : {}) };
  const rows = await Report.find(filter)
    .sort({ _id: -1 })
    .limit(PAGE + 1)
    .populate('reporter', AUTHOR_FIELDS)
    .populate({ path: 'post', select: 'text image author', populate: { path: 'author', select: AUTHOR_FIELDS } })
    .populate('user', `${AUTHOR_FIELDS} banned`);
  const items = rows.slice(0, PAGE);

  // How many open reports point at the same target, so repeat offenders stand out.
  const openCounts = await Report.aggregate([
    { $match: { status: 'open', $or: [{ post: { $in: items.map((r) => r.post?._id).filter(Boolean) } }, { user: { $in: items.map((r) => r.user?._id).filter(Boolean) } }] } },
    { $group: { _id: { $ifNull: ['$post', '$user'] }, n: { $sum: 1 } } },
  ]);
  const same = new Map(openCounts.map((c) => [String(c._id), c.n]));

  res.json({
    reports: items.map((r) => ({
      id: r._id,
      targetType: r.targetType,
      reason: r.reason,
      details: r.details,
      status: r.status,
      resolution: r.resolution,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
      reporter: r.reporter ? authorJSON(r.reporter) : null,
      openOnTarget: same.get(String(r.post?._id || r.user?._id)) || 0,
      post: r.post && r.post.author ? { id: r.post._id, text: r.post.text, hasImage: !!r.post.image, author: authorJSON(r.post.author) } : null,
      user: r.user ? { ...authorJSON(r.user), banned: r.user.banned } : null,
    })),
    nextCursor: rows.length > PAGE ? String(items[items.length - 1]._id) : null,
  });
}

export async function resolveReport(req, res) {
  if (!validId(req.params.id)) return bad(res, 'Report not found', 404);
  const { action } = req.body;
  if (!['dismiss', 'remove_post', 'suspend_user'].includes(action)) return bad(res, 'Unknown action');

  const report = await Report.findById(req.params.id);
  if (!report) return bad(res, 'Report not found', 404);
  if (report.status !== 'open') return bad(res, 'This report was already handled', 409);

  const sameTarget = report.post ? { post: report.post } : { user: report.user };
  const finish = (status, resolution) => Report.updateMany(
    { ...sameTarget, status: 'open' },
    { status, resolution, resolvedBy: req.user._id, resolvedAt: new Date() }
  );

  if (action === 'dismiss') {
    await finish('dismissed', 'No violation found');
    await record(req.user, 'Dismissed report', `${report.targetType} report (${report.reason})`);
    return res.json({ ok: true });
  }

  if (action === 'remove_post') {
    const post = report.post ? await Post.findById(report.post).populate('author', 'username') : null;
    if (!post) return bad(res, 'That post is already gone', 404);
    const label = `post by @${post.author?.username || 'unknown'}: ${snippet(post.text, 40)}`;
    await removePostCascade(post);
    await finish('actioned', 'Post removed');
    await record(req.user, 'Removed reported post', label);
    return res.json({ ok: true });
  }

  // suspend_user: the reported person, or the author of the reported post
  const post = report.post ? await Post.findById(report.post).select('author') : null;
  const target = await User.findById(report.user || post?.author);
  if (!target) return bad(res, 'That person is already gone', 404);
  if (target.role === 'admin') return bad(res, 'Admin accounts cannot be suspended', 403);
  target.banned = true;
  await target.save();
  await finish('actioned', 'Account suspended');
  await record(req.user, 'Suspended (from report)', `@${target.username}`);
  res.json({ ok: true });
}

/* --------------------------------------------------------------------- export */

// Spreadsheet apps run text that starts with = + - @ as a formula; a leading quote defuses it.
const cell = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const csv = (header, rows) => [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');

export async function exportCsv(req, res) {
  const { type } = req.params;
  const LIMIT = 5000;
  let body;

  if (type === 'users') {
    const rows = await User.find().sort({ _id: -1 }).limit(LIMIT);
    body = csv(['username', 'name', 'email', 'role', 'status', 'followers', 'joined'],
      rows.map((u) => [u.username, u.displayName, u.email, u.role, u.banned ? 'suspended' : 'active', u.followers.length, u.createdAt.toISOString()]));
  } else if (type === 'posts') {
    const rows = await Post.find().sort({ _id: -1 }).limit(LIMIT).populate('author', 'username');
    body = csv(['id', 'author', 'type', 'text', 'likes', 'comments', 'reshares', 'created'],
      rows.map((p) => [p._id, p.author?.username, p.repostOf ? (p.text ? 'quote' : 'reshare') : p.image ? 'photo' : 'text', p.text, p.likes.length, p.commentsCount, p.repostsCount || 0, p.createdAt.toISOString()]));
  } else if (type === 'reports') {
    const rows = await Report.find().sort({ _id: -1 }).limit(LIMIT).populate('reporter', 'username').populate('user', 'username').populate('post', 'text');
    body = csv(['created', 'reporter', 'target type', 'target', 'reason', 'details', 'status', 'resolution'],
      rows.map((r) => [r.createdAt.toISOString(), r.reporter?.username, r.targetType, r.user ? `@${r.user.username}` : snippet(r.post?.text, 60), r.reason, r.details, r.status, r.resolution]));
  } else {
    return bad(res, 'Unknown export', 404);
  }

  await record(req.user, 'Exported data', type);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="circl-${type}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`﻿${body}`);
}
