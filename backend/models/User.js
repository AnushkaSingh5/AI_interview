const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters']
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ],
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    role: {
      type: String,
      default: 'user'
    },
    profileImage: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: ''
    },
    experienceLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Beginner'
    },
    targetRole: {
      type: String,
      default: ''
    },
    targetCompany: {
      type: String,
      default: ''
    },
    preferredLanguage: {
      type: String,
      default: ''
    },
    preferredDifficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium'
    },
    skills: {
      type: [String],
      default: []
    },
    frameworks: {
      type: [String],
      default: []
    },
    databases: {
      type: [String],
      default: []
    },
    tools: {
      type: [String],
      default: []
    },
    softSkills: {
      type: [String],
      default: []
    },
    isProfileCompleted: {
      type: Boolean,
      default: false
    },
    profileCompletion: {
      type: Number,
      default: 0
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume'
    }
  },
  {
    timestamps: true
  }
);

// Encrypt password using bcrypt before save, and sync name and fullName
UserSchema.pre('save', async function (next) {
  // Sync name and fullName
  if (this.name && !this.fullName) {
    this.fullName = this.name;
  } else if (this.fullName && !this.name) {
    this.name = this.fullName;
  }

  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare user password
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Sign JWT and return
UserSchema.methods.generateToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

module.exports = mongoose.model('User', UserSchema);
