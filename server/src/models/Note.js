import mongoose from 'mongoose';

const keyConceptSchema = new mongoose.Schema(
  {
    concept: {
      type: String,
      required: true,
      trim: true
    },
    explanation: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const definitionSchema = new mongoose.Schema(
  {
    term: {
      type: String,
      required: true,
      trim: true
    },
    definition: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
      index: true
    },
    summary: {
      type: String,
      required: true,
      trim: true
    },
    keyConcepts: {
      type: [keyConceptSchema],
      default: []
    },
    definitions: {
      type: [definitionSchema],
      default: []
    },
    takeaways: {
      type: [String],
      default: []
    },
    source: {
      type: String,
      enum: ['title_description'],
      default: 'title_description'
    },
    contentFingerprint: {
      type: String,
      required: true,
      trim: true
    },
    promptVersion: {
      type: String,
      required: true,
      default: 'v1'
    },
    model: {
      type: String,
      required: true,
      default: 'gemini-3.8-flash'
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Unique cache index: one note per video per prompt version
noteSchema.index({ video: 1, promptVersion: 1 }, { unique: true });

export const Note = mongoose.model('Note', noteSchema);
export default Note;
