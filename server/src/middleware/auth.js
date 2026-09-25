import { verifyAccessToken } from '../utils/tokens.js';

// Define exactly where the token is read from — reject tokens from any other source
// (e.g. query strings, custom headers) to close off token-leak-via-logs/referrer vectors.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    // Fail securely: any verification failure (expired, bad signature, wrong audience) is a flat 401.
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}
