import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: [1000, 'Question text cannot exceed 1000 characters']
    },
    options: {
      type: [String],
      required: [true, 'Options are required'],
      validate: {
        validator: function (opts) {
          return Array.isArray(opts) && opts.length === 4 && opts.every((opt) => typeof opt === 'string' && opt.trim().length > 0);
        },
        message: 'Each question must have exactly four non-empty options'
      }
    },
    correctOptionIndex: {
      type: Number,
      required: [true, 'Correct option index is required'],
      min: [0, 'Correct option index must be between 0 and 3'],
      max: [3, 'Correct option index must be between 0 and 3']
    },
    explanation: {
      type: String,
      required: [true, 'Explanation for the correct option is required'],
      trim: true,
      maxlength: [2000, 'Explanation cannot exceed 2000 characters']
    }
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: [true, 'Associated video is required'],
      index: true
    },
    questions: {
      type: [questionSchema],
      required: [true, 'Quiz questions are required'],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length === 5;
        },
        message: 'A quiz must contain exactly five multiple-choice questions'
      }
    },
    contentFingerprint: {
      type: String,
      required: [true, 'Content fingerprint is required'],
      trim: true,
      index: true
    },
    promptVersion: {
      type: String,
      required: [true, 'Prompt version is required'],
      default: 'v1',
      trim: true
    },
    model: {
      type: String,
      required: [true, 'Model identifier is required'],
      trim: true
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Generating user is required']
    },
    source: {
      type: String,
      enum: ['title_description'],
      default: 'title_description'
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

// Compound unique index ensuring only 1 cached quiz per video and prompt version
quizSchema.index({ video: 1, promptVersion: 1 }, { unique: true });

/**
 * Returns a sanitized representation of the quiz questions suitable for presentation
 * to a learner, keeping correct answer indices and explanations hidden until evaluation.
 *
 * @param {object} quiz - Quiz document or plain object
 * @returns {object} Sanitized quiz payload
 */
export function sanitizeQuizForLearner(quiz) {
  if (!quiz) return null;
  const qObj = typeof quiz.toObject === 'function' ? quiz.toObject() : { ...quiz };

  return {
    _id: qObj._id,
    video: qObj.video,
    totalQuestions: qObj.questions?.length || 5,
    questions: (qObj.questions || []).map((q, index) => ({
      _id: q._id,
      questionIndex: index,
      questionText: q.questionText,
      options: q.options
    })),
    createdAt: qObj.createdAt,
    model: qObj.model,
    source: qObj.source
  };
}

export const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
