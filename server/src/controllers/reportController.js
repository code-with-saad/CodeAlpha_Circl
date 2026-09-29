import mongoose from 'mongoose';
import Post from '../models/Post.js';
import Report, { REPORT_REASONS } from '../models/Report.js';
import User from '../models/User.js';

const bad = (res, message, status = 400) => res.status(status).json({ message });

// Any signed-in person can report a post or a profile; admins review the queue.
export async function createReport(req, res) {
  const { type, id, reason } = req.body;
  const details = typeof req.body.details === 'string' ? req.body.details.trim() : '';
  if (type !== 'post' && type !== 'user') return bad(res, 'Choose what you are reporting');
  if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) return bad(res, 'Not found', 404);
  if (!REPORT_REASONS.includes(reason)) return bad(res, 'Choose a reason');
  if (details.length > 300) return bad(res, 'Details are limited to 300 characters');

  let owner;
  if (type === 'post') {
    const post = await Post.findById(id).select('author');
    if (!post) return bad(res, 'That post no longer exists', 404);
    owner = post.author;
  } else {
    const user = await User.findById(id).select('_id role');
    if (!user) return bad(res, 'That person no longer exists', 404);
    if (user.role === 'admin') return bad(res, 'That account cannot be reported', 403);
    owner = user._id;
  }
  if (String(owner) === String(req.user._id)) return bad(res, 'You cannot report yourself', 400);

  try {
    await Report.create({
      reporter: req.user._id, targetType: type, reason, details,
      post: type === 'post' ? id : null, user: type === 'user' ? id : null,
    });
  } catch (err) {
    if (err.code === 11000) return bad(res, 'You already reported this', 409);
    throw err;
  }
  res.status(201).json({ ok: true });
}
