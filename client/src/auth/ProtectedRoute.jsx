import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();

  if (user === undefined) return <div className="page-loading">Loading…</div>;
  if (user === null) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    // Redirect to somewhere this user's own role is allowed, not a fixed
    // route — otherwise a security-only user hitting an organizer-only
    // route would be bounced to "/" (also organizer-only) and loop forever.
    return <Navigate to={user.role === 'security' ? '/scanner' : '/'} replace />;
  }

  return children;
}
