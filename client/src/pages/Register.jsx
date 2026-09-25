import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/authApi.js';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authApi.register(form.email, form.password, form.displayName);
      setStatus(res.message);
    } catch (err) {
      setError(err.details?.map((d) => d.message).join(' ') || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status) {
    return (
      <div className="card">
        <h2>Check your email</h2>
        <p>{status}</p>
        <Link to="/login">Back to login</Link>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Create account</h2>
      <form onSubmit={onSubmit} autoComplete="off">
        <label>
          Display name
          <input name="displayName" value={form.displayName} onChange={onChange} required maxLength={100} />
        </label>
        <label>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            required
            maxLength={254}
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
        </label>
        <p className="hint">At least 12 characters, with upper, lower, digit, and special character.</p>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
