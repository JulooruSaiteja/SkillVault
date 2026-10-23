import mongoose from 'mongoose';
import slugify from '../utils/slugify.js';

const playlistSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Playlist title is required'],
      trim: true,
      maxlength: [200, 'Playlist title cannot exceed 200 characters']
    },
    slug: {
      type: String,
      required: [true, 'Playlist slug is required'],
      trim: true,
      lowercase: true,
      default: function () {
        return slugify(this.title);
      }
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: ''
    },
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: [true, 'Associated skill is required']
    },
    externalYoutubePlaylistId: {
      type: String,
      trim: true,
      default: null
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: ''
    },
    order: {
      type: Number,
      default: 0
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

// Auto-generate or format slug before validation
playlistSchema.pre('validate', function () {
  if (this.title && !this.slug) {
    this.slug = slugify(this.title);
  } else if (this.slug) {
    this.slug = slugify(this.slug);
  }
});

// Indexes
playlistSchema.index({ skill: 1, isActive: 1, order: 1 });
playlistSchema.index({ slug: 1 });
playlistSchema.index({ externalYoutubePlaylistId: 1 }, { sparse: true });

export const Playlist = mongoose.model('Playlist', playlistSchema);
export default Playlist;
