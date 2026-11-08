import mongoose from 'mongoose';

const userQuizScoreSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true
    },
    videoTitle: {
      type: String,
      trim: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 5
    },
    totalQuestions: {
      type: Number,
      default: 5
    },
    scoreDisplay: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false // Do not include password hash in query projections by default
    },
    role: {
      type: String,
      enum: {
        values: ['learner', 'admin'],
        message: '{VALUE} is not a valid user role'
      },
      default: 'learner'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    quizScores: {
      type: [userQuizScoreSchema],
      default: []
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const User = mongoose.model('User', userSchema);
export default User;
