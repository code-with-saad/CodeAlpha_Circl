import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { purgeUser } from '../utils/purge.js';
import { notify, unnotify } from '../utils/notify.js';
import { isOwnImage } from '../utils/cloudinary.js';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const profileOf = (user, viewerId) => ({
  ...user.toPublic(),
  email: undefined, // email is private to the owner
  isMe: String(user._id) === String(viewerId),
  isFollowing: user.followers.some((id) => String(id) === String(viewerId)),
});

export async function getProfile(req, res) {
  const username = String(req.params.username).toLowerCase();
  if (!USERNAME_RE.test(username)) return res.status(404).json({ message: 'User not found' });

  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user: profileOf(user, req.user._id) });
}

export async function updateMe(req, res) {
  const { displayName, bio, avatar } = req.body;
  const errors = {};

  if (displayName !== undefined) {
    if (typeof displayName !== 'string' || displayName.trim().length > 40) errors.displayName = 'Up to 40 characters';
    else req.user.displayName = displayName.trim();
  }
  if (bio !== undefined) {
    if (typeof bio !== 'string' || bio.trim().length > 160) errors.bio = 'Up to 160 characters';
    else req.user.bio = bio.trim();
  }
  if (avatar !== undefined) {
    if (avatar === '') req.user.avatar = '';
    else if (isOwnImage(avatar)) req.user.avatar = avatar;
    else errors.avatar = 'Invalid image';
  }

  if (Object.keys(errors).length) return res.status(400).json({ message: 'Check the highlighted fields', errors });
  await req.user.save();
  res.json({ user: req.user.toPublic() });
}

const cardOf = (u, viewer) => ({
  id: u._id,
  username: u.username,
  displayName: u.displayName || u.username,
  avatar: u.avatar,
  bio: u.bio,
  isMe: String(u._id) === String(viewer._id),
  isFollowing: viewer.following.some((id) => String(id) === String(u._id)),
});

// Idempotent: POST follows, DELETE unfollows; both sides of the relation are updated together.
export async function setFollow(req, res) {
  const username = String(req.params.username).toLowerCase();
  if (!USERNAME_RE.test(username)) return res.status(404).json({ message: 'User not found' });
  const target = await User.findOne({ username }).select('_id');
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (String(target._id) === String(req.user._id)) return res.status(400).json({ message: 'You cannot follow yourself' });

  const on = req.method === 'POST';
  const [mine, theirs] = on
    ? [{ $addToSet: { following: target._id } }, { $addToSet: { followers: req.user._id } }]
    : [{ $pull: { following: target._id } }, { $pull: { followers: req.user._id } }];
  await Promise.all([User.updateOne({ _id: req.user._id }, mine), User.updateOne({ _id: target._id }, theirs)]);

  if (on) await notify({ recipient: target._id, actor: req.user._id, type: 'follow' });
  else await unnotify({ recipient: target._id, actor: req.user._id, type: 'follow' });

  const fresh = await User.findById(target._id).select('followers');
  res.json({ isFollowing: on, followersCount: fresh.followers.length });
}

async function listRelation(req, res, field) {
  const username = String(req.params.username).toLowerCase();
  if (!USERNAME_RE.test(username)) return res.status(404).json({ message: 'User not found' });
  const user = await User.findOne({ username }).select(field).slice(field, 100).populate(field, 'username displayName avatar bio');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ users: user[field].map((u) => cardOf(u, req.user)) });
}

export const listFollowers = (req, res) => listRelation(req, res, 'followers');
export const listFollowing = (req, res) => listRelation(req, res, 'following');

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// People you may know: ranked by how many of the people you follow already follow them, then by popularity.
export async function suggested(req, res) {
  const exclude = [req.user._id, ...req.user.following];
  const rows = await User.aggregate([
    { $match: { _id: { $nin: exclude }, banned: false } },
    {
      $addFields: {
        mutual: { $size: { $setIntersection: ['$followers', req.user.following] } },
        popularity: { $size: '$followers' },
      },
    },
    { $sort: { mutual: -1, popularity: -1, createdAt: -1 } },
    { $limit: 5 },
    { $project: { username: 1, displayName: 1, avatar: 1, bio: 1, mutual: 1 } },
  ]);
  res.json({
    users: rows.map((u) => ({
      id: u._id, username: u.username, displayName: u.displayName || u.username, avatar: u.avatar, bio: u.bio,
      mutual: u.mutual, isMe: false, isFollowing: false,
    })),
  });
}

export async function search(req, res) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 30) : '';
  if (q.length < 2) return res.json({ users: [] });
  const re = new RegExp(`^${escapeRe(q)}`, 'i');
  const users = await User.find({ banned: false, $or: [{ username: re }, { displayName: re }] })
    .select('username displayName avatar bio').limit(10);
  res.json({ users: users.map((u) => cardOf(u, req.user)) });
}

const asText = (v) => (typeof v === 'string' ? v : '');

export async function changePassword(req, res) {
  const current = asText(req.body.current);
  const next = asText(req.body.next);
  if (next.length < 8 || next.length > 72) {
    return res.status(400).json({ message: 'Check the highlighted fields', errors: { next: 'Use 8 to 72 characters' } });
  }
  const user = await User.findById(req.user._id).select('+password');
  if (!(await bcrypt.compare(current, user.password))) {
    return res.status(400).json({ message: 'Check the highlighted fields', errors: { current: 'Current password is incorrect' } });
  }
  if (current === next) {
    return res.status(400).json({ message: 'Check the highlighted fields', errors: { next: 'Choose a different password' } });
  }
  user.password = await bcrypt.hash(next, 12);
  user.passwordChangedAt = new Date();
  await user.save();
  // Every older session is now invalid; hand this device a fresh token so it stays signed in.
  res.json({ token: signToken(user._id) });
}

export async function deleteAccount(req, res) {
  if (req.user.role === 'admin') return res.status(403).json({ message: 'Admin accounts cannot be deleted here' });
  const user = await User.findById(req.user._id).select('+password');
  if (!(await bcrypt.compare(asText(req.body.password), user.password))) {
    return res.status(400).json({ message: 'Password is incorrect', errors: { password: 'Password is incorrect' } });
  }
  await purgeUser(user);
  res.json({ ok: true });
}
