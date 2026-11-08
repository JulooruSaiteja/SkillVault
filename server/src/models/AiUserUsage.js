import mongoose from 'mongoose';
import { AI_FEATURE_LIST } from '../config/aiConfig.js';

const aiUserUsageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    feature: {
      type: String,
      required: true,
      enum: AI_FEATURE_LIST,
      trim: true
    },
    utcDay: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true
    },
    successCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    lastSuccessAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// One usage tracking document per user, per feature, per UTC day
aiUserUsageSchema.index({ user: 1, feature: 1, utcDay: 1 }, { unique: true });

export const AiUserUsage = mongoose.model('AiUserUsage', aiUserUsageSchema);
export default AiUserUsage;
