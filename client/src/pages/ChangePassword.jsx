import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/authApi.js';

export default function ChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await authApi.changePassword(form.currentPassword, form.newPassword);
      setMessage(res.message);
      setForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setError(err.details?.map((d) => d.message).join(' ') || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2>Change password</h2>
      <form onSubmit={onSubmit} autoComplete="off">
        <label>
          Current password
          <input
            type="password"
            value={form.currentPassword}
            onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
            required
            maxLength={128}
            autoComplete="current-password"
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
        </label>
        <p className="hint">At least 12 characters, with upper, lower, digit, and special character.</p>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Updating…' : 'Change password'}
        </button>
      </form>
      <p>
        <Link to="/dashboard">Back to dashboard</Link>
      </p>
    </div>
  );
}
