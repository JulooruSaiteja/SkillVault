import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema(
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

// Compound unique index: exactly one bookmark per user and video
bookmarkSchema.index({ user: 1, video: 1 }, { unique: true });
// Index for sorting user bookmarks in descending chronological order
bookmarkSchema.index({ user: 1, createdAt: -1 });

export const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
export default Bookmark;
