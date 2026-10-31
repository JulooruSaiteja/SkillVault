import mongoose from 'mongoose';

const videoProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: [true, 'Video reference is required']
    },
    lastPositionSeconds: {
      type: Number,
      default: 0,
      min: [0, 'Position cannot be negative']
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: [0, 'Duration cannot be negative']
    },
    isCompleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Unique compound index: exactly one progress record per user and video
videoProgressSchema.index({ user: 1, video: 1 }, { unique: true });
videoProgressSchema.index({ user: 1, updatedAt: -1 });

// Automatically compute isCompleted flag when position reaches >= 90% duration
videoProgressSchema.pre('save', function () {
  if (this.durationSeconds > 0 && this.lastPositionSeconds >= 0.9 * this.durationSeconds) {
    this.isCompleted = true;
  }
});

export const VideoProgress = mongoose.model('VideoProgress', videoProgressSchema);
export default VideoProgress;
