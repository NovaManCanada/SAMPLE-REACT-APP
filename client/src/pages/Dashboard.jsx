import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="card">
      <h2>Welcome, {user?.displayName}</h2>
      <p>Email: {user?.email}</p>
      <p>Email verified: {user?.isEmailVerified ? 'Yes' : 'No'}</p>
    </div>
  );
}
