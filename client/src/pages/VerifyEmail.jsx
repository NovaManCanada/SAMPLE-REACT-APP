import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/authApi.js';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const email = params.get('email');
    const token = params.get('token');
    if (!email || !token) {
      setStatus('error');
      setMessage('Missing verification link parameters.');
      return;
    }
    authApi
      .verifyEmail(email, token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message);
      });
  }, [params]);

  return (
    <div className="card">
      <h2>Email verification</h2>
      <p>{message || 'Verifying…'}</p>
      {status === 'success' && <Link to="/login">Go to login</Link>}
    </div>
  );
}
