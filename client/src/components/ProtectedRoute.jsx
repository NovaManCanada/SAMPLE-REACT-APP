import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Client-side gating is UX only — the real access control is enforced server-side by
// requireAuth on every protected API route. Never trust this component as a security boundary.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
