// Minimal centralised logging routine. Never pass secrets, tokens, or passwords into `meta`.
const SENSITIVE_KEYS = new Set(['password', 'token', 'refreshToken', 'accessToken', 'authorization', 'secret']);

function redact(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  const clean = {};
  for (const [key, value] of Object.entries(meta)) {
    clean[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : value;
  }
  return clean;
}

function write(level, message, meta) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redact(meta),
  };
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry));
}

export const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
