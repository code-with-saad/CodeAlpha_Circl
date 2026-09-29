import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 300 },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, _id: 1 });

export default mongoose.models.Comment || mongoose.model('Comment', commentSchema);
