export const AUTHOR_FIELDS = 'username displayName avatar';
export const POST_POPULATE = [
  { path: 'author', select: AUTHOR_FIELDS },
  { path: 'repostOf', populate: { path: 'author', select: AUTHOR_FIELDS } },
];

export const authorJSON = (u) => ({ id: u._id, username: u.username, displayName: u.displayName || u.username, avatar: u.avatar });

const embedded = (o) => (o && o.author
  ? { id: o._id, text: o.text, image: o.image, author: authorJSON(o.author), createdAt: o.createdAt }
  : null);

// `viewer` is the requesting User document. `resharedIds` is a Set of post ids the viewer has reshared.
export const postJSON = (p, viewer, resharedIds = new Set()) => ({
  id: p._id,
  text: p.text,
  image: p.image,
  author: authorJSON(p.author),
  repostOf: embedded(p.repostOf),
  isRepost: !!p.repostOf,
  likesCount: p.likes.length,
  liked: p.likes.some((id) => String(id) === String(viewer._id)),
  saved: viewer.saved.some((id) => String(id) === String(p._id)),
  reshared: resharedIds.has(String(p._id)) || (!!p.repostOf && resharedIds.has(String(p.repostOf._id))),
  // A reshare card shows the original's reshare count, since that is what the button acts on.
  repostsCount: (p.repostOf ? p.repostOf.repostsCount : p.repostsCount) || 0,
  commentsCount: p.commentsCount,
  createdAt: p.createdAt,
});

export const commentJSON = (c) => ({
  id: c._id,
  post: c.post,
  text: c.text,
  author: authorJSON(c.author),
  createdAt: c.createdAt,
});
