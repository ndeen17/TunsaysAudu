import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();

  if (user === undefined) return <div className="page-loading">Loading…</div>;
  if (user === null) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}
