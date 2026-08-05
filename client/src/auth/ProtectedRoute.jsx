import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user === undefined) return <div className="page-loading">Loading…</div>;
  if (user === null) {
    // Preserve where the user was headed (e.g. a /scan/:token link opened
    // from a phone's camera app while logged out) so Login can send them
    // straight back there instead of dropping them on the default page.
    const from = location.pathname + location.search;
    return <Navigate to="/login" state={{ from }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    // Redirect to somewhere this user's own role is allowed, not a fixed
    // route — otherwise a security-only user hitting an organizer-only
    // route would be bounced to "/" (also organizer-only) and loop forever.
    return <Navigate to={user.role === 'security' ? '/scanner' : '/'} replace />;
  }

  return children;
}
