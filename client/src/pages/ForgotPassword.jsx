import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/authApi.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authApi.forgotPassword(email);
      setMessage(res.message);
    } catch (err) {
      // Even on error, don't reveal account existence — show the same generic message.
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2>Forgot password</h2>
      {message ? (
        <p>{message}</p>
      ) : (
        <form onSubmit={onSubmit} autoComplete="off">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
              autoComplete="username"
            />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <p>
        <Link to="/login">Back to login</Link>
      </p>
    </div>
  );
}
