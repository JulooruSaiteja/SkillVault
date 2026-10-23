import mongoose from 'mongoose';
import slugify from '../utils/slugify.js';

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Video title is required'],
      trim: true,
      maxlength: [250, 'Video title cannot exceed 250 characters']
    },
    slug: {
      type: String,
      required: [true, 'Video slug is required'],
      trim: true,
      lowercase: true,
      default: function () {
        return slugify(this.title);
      }
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: [true, 'Associated skill is required']
    },
    playlist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Playlist',
      default: null
    },
    order: {
      type: Number,
      default: 0
    },
    youtubeVideoId: {
      type: String,
      required: [true, 'YouTube video ID is required'],
      trim: true
    },
    durationSeconds: {
      type: Number,
      required: [true, 'Duration in seconds is required'],
      min: [0, 'Duration cannot be negative']
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: ''
    },
    transcript: {
      type: String,
      trim: true,
      default: null
    },
    hasTranscript: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
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

// Auto-generate or format slug and synchronize hasTranscript flag
videoSchema.pre('validate', function () {
  if (this.title && !this.slug) {
    this.slug = slugify(this.title);
  } else if (this.slug) {
    this.slug = slugify(this.slug);
  }

  this.hasTranscript = Boolean(this.transcript && this.transcript.trim().length > 0);
});

// Indexes
videoSchema.index({ skill: 1, isActive: 1 });
videoSchema.index({ playlist: 1, order: 1 });
videoSchema.index({ youtubeVideoId: 1 });
videoSchema.index({ slug: 1 });

export const Video = mongoose.model('Video', videoSchema);
export default Video;
