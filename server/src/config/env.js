import 'dotenv/config';

// SECURITY: fail securely — never fall back to insecure defaults for secrets.
// If a required var is missing, refuse to start rather than run unprotected.
const required = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CLIENT_ORIGIN',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}. Refusing to start.`);
  }
}

if (
  process.env.NODE_ENV === 'production' &&
  (process.env.JWT_ACCESS_SECRET.length < 32 || process.env.JWT_REFRESH_SECRET.length < 32)
) {
  throw new Error('JWT secrets must be at least 32 characters in production. Refusing to start.');
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  mongoUri: process.env.MONGODB_URI,
  clientOrigins: process.env.CLIENT_ORIGIN.split(',').map((o) => o.trim()),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  emailVerificationTtlMin: parseInt(process.env.EMAIL_VERIFICATION_TTL_MIN, 10) || 1440,
  passwordResetTtlMin: parseInt(process.env.PASSWORD_RESET_TTL_MIN, 10) || 30,
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  emailFrom: process.env.EMAIL_FROM || 'no-reply@example.com',
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 3,
  lockoutMinutes: parseInt(process.env.LOCKOUT_MINUTES, 10) || 15,
  // SECURITY: these defaults (20 req/15min, 5 req/hour) are the production-safe values from the
  // Sapiens secure coding checklist. Override via env only for local development convenience —
  // never loosen these in a deployed environment.
  authRateLimit: {
    windowMs: (parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MIN, 10) || 15) * 60 * 1000,
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
  },
  sensitiveRateLimit: {
    windowMs: (parseInt(process.env.SENSITIVE_RATE_LIMIT_WINDOW_MIN, 10) || 60) * 60 * 1000,
    max: parseInt(process.env.SENSITIVE_RATE_LIMIT_MAX, 10) || 5,
  },
};
