import Notification from '../models/Notification.js';

// Never notify yourself. Likes and follows are de-duplicated so toggling does not spam the recipient.
export async function notify({ recipient, actor, type, post = null, text = '' }) {
  if (String(recipient) === String(actor)) return;
  try {
    if (type === 'like' || type === 'follow') {
      await Notification.updateOne(
        { recipient, actor, type, post },
        { $setOnInsert: { recipient, actor, type, post, text }, $set: { read: false } },
        { upsert: true }
      );
    } else {
      await Notification.create({ recipient, actor, type, post, text: text.slice(0, 100) });
    }
  } catch (err) {
    // A failed notification must never fail the action that caused it.
    console.error('notify failed', err.message);
  }
}

// Undoing an action (unlike, unfollow) takes the notification back.
export const unnotify = (filter) => Notification.deleteMany(filter).catch(() => {});
