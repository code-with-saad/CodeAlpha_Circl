import mongoose from 'mongoose';

export const REPORT_REASONS = ['spam', 'harassment', 'hate', 'misinformation', 'inappropriate', 'other'];

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['post', 'user'], required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 300, default: '' },
    status: { type: String, enum: ['open', 'actioned', 'dismissed'], default: 'open' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    resolution: { type: String, default: '' },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, _id: -1 });
// One report per person per target, so nobody can flood the queue with the same complaint.
reportSchema.index({ reporter: 1, post: 1 }, { unique: true, partialFilterExpression: { post: { $type: 'objectId' } } });
reportSchema.index({ reporter: 1, user: 1 }, { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } });

export default mongoose.models.Report || mongoose.model('Report', reportSchema);
