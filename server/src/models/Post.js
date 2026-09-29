import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, trim: true, maxlength: 500, default: '' },
    image: { type: String, default: '' },
    tags: { type: [String], default: [] },
    // Set when this post is a reshare (empty text) or a quote (with text) of another post.
    repostOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    repostsCount: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    commentsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Feed and profile queries both sort newest-first, optionally filtered by author.
postSchema.index({ author: 1, _id: -1 });
postSchema.index({ tags: 1, _id: -1 });
postSchema.index({ repostOf: 1, author: 1 });
postSchema.index({ createdAt: -1 });

export default mongoose.models.Post || mongoose.model('Post', postSchema);
