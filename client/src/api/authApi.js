// Access token is kept in memory only (never localStorage/sessionStorage) so it can't be
// exfiltrated by an XSS payload reading browser storage. The refresh token lives in an
// HttpOnly cookie the JS layer can never read at all.
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function parseJsonSafely(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function request(path, { method = 'GET', body, retry = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`/api/auth${path}`, {
    method,
    headers,
    credentials: 'include', // send the HttpOnly refresh cookie
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && path !== '/refresh') {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request(path, { method, body, retry: false });
  }

  const data = await parseJsonSafely(res);
  if (!res.ok) {
    const error = new Error(data?.error || 'Request failed.');
    error.details = data?.details;
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function refreshAccessToken() {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      setAccessToken(null);
      return false;
    }
    const data = await res.json();
    setAccessToken(data.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

export const authApi = {
  register: (email, password, displayName) =>
    request('/register', { method: 'POST', body: { email, password, displayName } }),
  verifyEmail: (email, token) => request('/verify-email', { method: 'POST', body: { email, token } }),
  resendVerification: (email) => request('/resend-verification', { method: 'POST', body: { email } }),
  login: async (email, password) => {
    const data = await request('/login', { method: 'POST', body: { email, password }, retry: false });
    setAccessToken(data.accessToken);
    return data;
  },
  logout: async () => {
    await request('/logout', { method: 'POST', retry: false });
    setAccessToken(null);
  },
  forgotPassword: (email) => request('/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (email, token, newPassword) =>
    request('/reset-password', { method: 'POST', body: { email, token, newPassword } }),
  changePassword: (currentPassword, newPassword) =>
    request('/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  me: () => request('/me'),
};
