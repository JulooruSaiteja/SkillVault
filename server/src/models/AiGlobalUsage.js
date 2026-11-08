import mongoose from 'mongoose';
import { AI_FEATURE_LIST } from '../config/aiConfig.js';

const aiGlobalUsageSchema = new mongoose.Schema(
  {
    feature: {
      type: String,
      required: true,
      enum: AI_FEATURE_LIST,
      trim: true
    },
    model: {
      type: String,
      required: true,
      trim: true
    },
    utcDay: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    lastAttemptAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Concurrency-safe unique compound index: one document per feature per UTC day
aiGlobalUsageSchema.index({ feature: 1, utcDay: 1 }, { unique: true });

export const AiGlobalUsage = mongoose.model('AiGlobalUsage', aiGlobalUsageSchema);
export default AiGlobalUsage;
