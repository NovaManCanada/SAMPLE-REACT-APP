import { validationResult } from 'express-validator';

// Centralised validation routine: reject on failure rather than "best-effort" sanitising and
// continuing. Returns a generic shape — never echoes back raw user input verbatim to keep
// reflected-XSS surface minimal.
export function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return res.status(400).json({
    error: 'Invalid input.',
    details: result.array().map((e) => ({ field: e.path, message: e.msg })),
  });
}
