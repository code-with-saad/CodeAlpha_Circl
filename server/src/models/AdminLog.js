import mongoose from 'mongoose';

// A plain audit trail of moderation actions: who did what to whom.
const adminLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, maxlength: 60 },
    target: { type: String, default: '', maxlength: 120 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

adminLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.models.AdminLog || mongoose.model('AdminLog', adminLogSchema);
