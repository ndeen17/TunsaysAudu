import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';

export default function OrganizerLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">Wedding Invites</span>
        <nav className="app-nav">
          <NavLink to="/" end>
            Invites
          </NavLink>
          <NavLink to="/guests">Guests &amp; Seating</NavLink>
          <NavLink to="/scanner">Scanner</NavLink>
        </nav>
        <div className="app-header-right">
          <span className="muted">{user?.username}</span>
          <button className="link-button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
