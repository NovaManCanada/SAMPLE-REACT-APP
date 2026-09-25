import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// SECURITY: rate-limit auth and other sensitive endpoints to blunt credential-stuffing and
// enumeration attacks. Keyed by IP; account-level lockout (see User.failedLoginAttempts) is a
// second, independent layer (defense-in-depth). Limits are configurable via env for local dev
// convenience — see server/.env.example for the production-safe defaults.
export const authLimiter = rateLimit({
  windowMs: env.authRateLimit.windowMs,
  limit: env.authRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

export const strictSensitiveLimiter = rateLimit({
  windowMs: env.sensitiveRateLimit.windowMs,
  limit: env.sensitiveRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
