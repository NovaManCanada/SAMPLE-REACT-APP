import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const BCRYPT_COST = 12;

export async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// One-way hash for opaque, single-use tokens (email verification, password reset, refresh tokens).
// These are looked up by exact match, not compared for password strength, so a fast CSPRNG-derived
// hash (SHA-256) is appropriate here rather than bcrypt.
export function hashOpaqueToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// CSPRNG-backed opaque token for emailed links (verification / reset). Sent to the user once,
// never stored in plaintext — only its hash is persisted.
export function generateOpaqueToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessTtl,
    issuer: 'sample-auth-app',
    audience: 'sample-auth-app-client',
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret, {
    issuer: 'sample-auth-app',
    audience: 'sample-auth-app-client',
    algorithms: ['HS256'],
  });
}

export function signRefreshToken(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: user._id.toString(), jti }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshTtl,
    issuer: 'sample-auth-app',
    audience: 'sample-auth-app-client',
  });
  return { token, jti };
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret, {
    issuer: 'sample-auth-app',
    audience: 'sample-auth-app-client',
    algorithms: ['HS256'],
  });
}
