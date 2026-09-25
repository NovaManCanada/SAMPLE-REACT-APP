import { User } from '../models/User.js';
import {
  hashPassword,
  verifyPassword,
  hashOpaqueToken,
  generateOpaqueToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendPasswordChangedNotice } from '../utils/email.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const REFRESH_COOKIE_NAME = 'refreshToken';
const PASSWORD_HISTORY_LIMIT = 10;
const MIN_PASSWORD_AGE_MS = 24 * 60 * 60 * 1000;

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

async function issueSession(user, req, res) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, jti } = signRefreshToken(user);
  const decoded = verifyRefreshToken(refreshToken);

  user.refreshTokens = user.refreshTokens || [];
  // Cap concurrent sessions per account to limit blast radius of a stolen refresh token.
  if (user.refreshTokens.length >= 10) {
    user.refreshTokens = user.refreshTokens.slice(-9);
  }
  user.refreshTokens.push({
    tokenHash: hashOpaqueToken(`${jti}`),
    expiresAt: new Date(decoded.exp * 1000),
    userAgent: (req.headers['user-agent'] || '').slice(0, 200),
  });
  await user.save();

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  return accessToken;
}

async function clearAllSessions(user) {
  user.refreshTokens = [];
  await user.save();
}

// ---- Registration ----------------------------------------------------

export async function register(req, res, next) {
  try {
    const { email, password, displayName } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      // Avoid user-enumeration: same generic response whether or not the account exists.
      return res.status(202).json({
        message: 'If that email is available, a verification link has been sent to it.',
      });
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = generateOpaqueToken();

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      passwordHistory: [passwordHash],
      displayName,
      emailVerificationTokenHash: hashOpaqueToken(verificationToken),
      emailVerificationExpiresAt: new Date(Date.now() + env.emailVerificationTtlMin * 60 * 1000),
    });

    const verifyUrl = `${req.headers.origin || ''}/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;
    await sendVerificationEmail(normalizedEmail, verifyUrl);

    logger.info('User registered', { userId: user._id.toString() });
    return res.status(202).json({
      message: 'If that email is available, a verification link has been sent to it.',
    });
  } catch (err) {
    return next(err);
  }
}

// ---- Email verification ------------------------------------------------

export async function verifyEmail(req, res, next) {
  try {
    const { email, token } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const tokenHash = hashOpaqueToken(token);

    const user = await User.findOne({
      email: normalizedEmail,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification link.' });
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    logger.info('Email verified', { userId: user._id.toString() });
    return res.json({ message: 'Email verified. You can now log in.' });
  } catch (err) {
    return next(err);
  }
}

export async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (user && !user.isEmailVerified) {
      const verificationToken = generateOpaqueToken();
      user.emailVerificationTokenHash = hashOpaqueToken(verificationToken);
      user.emailVerificationExpiresAt = new Date(Date.now() + env.emailVerificationTtlMin * 60 * 1000);
      await user.save();

      const verifyUrl = `${req.headers.origin || ''}/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;
      await sendVerificationEmail(normalizedEmail, verifyUrl);
    }

    // Generic response regardless of whether the account exists or was already verified.
    return res.status(202).json({ message: 'If that account needs verification, a new link has been sent.' });
  } catch (err) {
    return next(err);
  }
}

// ---- Login / logout / refresh ------------------------------------------

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+passwordHash +failedLoginAttempts +lockedUntil',
    );

    // Constant generic error for "no such user" and "bad password" — don't reveal which failed.
    const genericAuthError = () => res.status(401).json({ error: 'Invalid email or password.' });

    if (!user) return genericAuthError();

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      logger.warn('Login blocked: account locked', { userId: user._id.toString() });
      return res.status(423).json({
        error: `Account temporarily locked due to repeated failed attempts. Try again later.`,
      });
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= env.maxLoginAttempts) {
        user.lockedUntil = new Date(Date.now() + env.lockoutMinutes * 60 * 1000);
        user.failedLoginAttempts = 0;
        logger.warn('Account locked after repeated failed logins', { userId: user._id.toString() });
      }
      await user.save();
      return genericAuthError();
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;

    const accessToken = await issueSession(user, req, res);

    logger.info('Login success', { userId: user._id.toString() });
    return res.json({
      accessToken,
      user: user.toJSON(),
    });
  } catch (err) {
    return next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'No session.' });

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    const user = await User.findById(payload.sub).select('+refreshTokens');
    if (!user) {
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
      return res.status(401).json({ error: 'Invalid session.' });
    }

    const presentedHash = hashOpaqueToken(payload.jti);
    const matchIndex = user.refreshTokens.findIndex((rt) => rt.tokenHash === presentedHash);

    if (matchIndex === -1) {
      // Token not found in the store — either expired/pruned or a stolen/replayed token being
      // reused after rotation. Treat as a possible compromise and revoke every session on this
      // account (fail securely).
      logger.warn('Refresh token reuse/mismatch detected — revoking all sessions', {
        userId: user._id.toString(),
      });
      await clearAllSessions(user);
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    // Rotate: remove the used token, issue a brand new one (refresh-token rotation).
    user.refreshTokens.splice(matchIndex, 1);
    await user.save();

    const accessToken = await issueSession(user, req, res);
    return res.json({ accessToken });
  } catch (err) {
    return next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());

    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        const user = await User.findById(payload.sub).select('+refreshTokens');
        if (user) {
          const presentedHash = hashOpaqueToken(payload.jti);
          user.refreshTokens = user.refreshTokens.filter((rt) => rt.tokenHash !== presentedHash);
          await user.save();
        }
      } catch {
        // Token already invalid/expired — nothing to revoke, still return success below.
      }
    }
    return res.json({ message: 'Logged out.' });
  } catch (err) {
    return next(err);
  }
}

// ---- Password reset -----------------------------------------------------

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const resetToken = generateOpaqueToken();
      user.passwordResetTokenHash = hashOpaqueToken(resetToken);
      user.passwordResetExpiresAt = new Date(Date.now() + env.passwordResetTtlMin * 60 * 1000);
      await user.save();

      const resetUrl = `${req.headers.origin || ''}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;
      await sendPasswordResetEmail(normalizedEmail, resetUrl);
      logger.info('Password reset requested', { userId: user._id.toString() });
    }

    // Same response whether or not the account exists — prevents email enumeration.
    return res.status(202).json({
      message: 'If that email is registered, a password reset link has been sent to it.',
    });
  } catch (err) {
    return next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, token, newPassword } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const tokenHash = hashOpaqueToken(token);

    const user = await User.findOne({
      email: normalizedEmail,
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpiresAt +passwordHistory +passwordHash +passwordChangedAt');

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset link.' });
    }

    for (const oldHash of user.passwordHistory || []) {
      if (await verifyPassword(newPassword, oldHash)) {
        return res.status(400).json({ error: 'You cannot reuse a recent password.' });
      }
    }

    user.passwordHash = await hashPassword(newPassword);
    user.passwordHistory = [user.passwordHash, ...(user.passwordHistory || [])].slice(0, PASSWORD_HISTORY_LIMIT);
    user.passwordChangedAt = new Date();
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;

    // Reset compromises the credential's secrecy boundary (link was emailed) — revoke every
    // existing session so a previously stolen access/refresh token stops working.
    await clearAllSessions(user);

    await sendPasswordChangedNotice(normalizedEmail);
    logger.info('Password reset completed', { userId: user._id.toString() });

    return res.json({ message: 'Password updated. Please log in again.' });
  } catch (err) {
    return next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select(
      '+passwordHash +passwordHistory +passwordChangedAt',
    );
    if (!user) return res.status(401).json({ error: 'Not authenticated.' });

    const currentOk = await verifyPassword(currentPassword, user.passwordHash);
    if (!currentOk) return res.status(401).json({ error: 'Current password is incorrect.' });

    if (Date.now() - user.passwordChangedAt.getTime() < MIN_PASSWORD_AGE_MS) {
      return res.status(400).json({ error: 'Password was changed too recently. Try again later.' });
    }

    for (const oldHash of user.passwordHistory || []) {
      if (await verifyPassword(newPassword, oldHash)) {
        return res.status(400).json({ error: 'You cannot reuse a recent password.' });
      }
    }

    user.passwordHash = await hashPassword(newPassword);
    user.passwordHistory = [user.passwordHash, ...(user.passwordHistory || [])].slice(0, PASSWORD_HISTORY_LIMIT);
    user.passwordChangedAt = new Date();
    await clearAllSessions(user);
    await sendPasswordChangedNotice(user.email);

    return res.json({ message: 'Password changed. Please log in again.' });
  } catch (err) {
    return next(err);
  }
}

// ---- Current user --------------------------------------------------------

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Not found.' });
    return res.json({ user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
}
