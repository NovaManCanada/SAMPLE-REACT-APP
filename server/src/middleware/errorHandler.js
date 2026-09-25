import { logger } from '../utils/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found.' });
}

// Application-level error handler: generic message to the client, full detail only to logs.
// Never leak stack traces or internal error messages in the HTTP response (fail securely).
export function errorHandler(err, req, res, _next) {
  logger.error('Unhandled error', {
    message: err.message,
    path: req.path,
    method: req.method,
  });
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error.' : err.publicMessage || 'Request failed.' });
}
