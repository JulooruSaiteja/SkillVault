import mongoose from 'mongoose';
import slugify from '../utils/slugify.js';

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
      maxlength: [100, 'Skill name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      required: [true, 'Skill slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      default: function () {
        return slugify(this.name);
      }
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: ''
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Parent category is required']
    },
    icon: {
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
skillSchema.pre('validate', function () {
  if (this.name && !this.slug) {
    this.slug = slugify(this.name);
  } else if (this.slug) {
    this.slug = slugify(this.slug);
  }
});

// Compound index for querying skills by category and active status
skillSchema.index({ category: 1, isActive: 1, order: 1 });

export const Skill = mongoose.model('Skill', skillSchema);
export default Skill;
