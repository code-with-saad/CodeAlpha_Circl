import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { AUTHOR_FIELDS, authorJSON } from '../utils/serialize.js';

const PAGE = 30;

export async function list(req, res) {
  const { cursor } = req.query;
  if (cursor !== undefined && !(typeof cursor === 'string' && mongoose.isValidObjectId(cursor))) {
    return res.status(400).json({ message: 'Invalid cursor' });
  }
  const filter = { recipient: req.user._id, ...(cursor ? { _id: { $lt: cursor } } : {}) };
  const rows = await Notification.find(filter)
    .sort({ _id: -1 })
    .limit(PAGE + 1)
    .populate('actor', AUTHOR_FIELDS)
    .populate('post', 'text image');
  const items = rows.slice(0, PAGE).filter((n) => n.actor); // actor may be gone if the account was deleted

  res.json({
    notifications: items.map((n) => ({
      id: n._id,
      type: n.type,
      read: n.read,
      text: n.text,
      createdAt: n.createdAt,
      actor: authorJSON(n.actor),
      post: n.post ? { id: n.post._id, text: n.post.text.slice(0, 80), hasImage: !!n.post.image } : null,
    })),
    nextCursor: rows.length > PAGE ? String(rows[PAGE - 1]._id) : null,
  });
}

// Polled every few seconds by every open tab, so it is a single indexed count.
export async function unreadCount(req, res) {
  res.json({ count: await Notification.countDocuments({ recipient: req.user._id, read: false }) });
}

export async function markAllRead(req, res) {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
}
