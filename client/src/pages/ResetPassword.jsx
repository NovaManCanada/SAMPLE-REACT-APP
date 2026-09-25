import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/authApi.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const email = params.get('email');
  const token = params.get('token');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.resetPassword(email, token, newPassword);
      setDone(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.details?.map((d) => d.message).join(' ') || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!email || !token) {
    return (
      <div className="card">
        <h2>Reset password</h2>
        <p className="error">Missing or invalid reset link.</p>
        <Link to="/forgot-password">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Reset password</h2>
      {done ? (
        <p>Password updated. Redirecting to login…</p>
      ) : (
        <form onSubmit={onSubmit} autoComplete="off">
          <label>
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <p className="hint">At least 12 characters, with upper, lower, digit, and special character.</p>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
    </div>
  );
}
