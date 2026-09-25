import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    // SECURITY: never store the raw refresh token — only a hash of it (Control: credential storage).
    tokenHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // select:false — never returned by default queries; must be explicitly requested.
    passwordHash: { type: String, required: true, select: false },
    passwordChangedAt: { type: Date, default: Date.now },
    // Prevent immediate password re-cycling (Sapiens: 1-day minimum age) and re-use (history of 10).
    passwordHistory: { type: [String], default: [], select: false },

    displayName: { type: String, required: true, trim: true, maxlength: 100 },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },

    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },

    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, select: false },

    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },

    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
  },
  { timestamps: true },
);

// Data minimisation: never expose internal auth fields via JSON serialisation, even if a query
// accidentally selects them back in.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.passwordHistory;
    delete ret.emailVerificationTokenHash;
    delete ret.emailVerificationExpiresAt;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpiresAt;
    delete ret.failedLoginAttempts;
    delete ret.lockedUntil;
    delete ret.refreshTokens;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
