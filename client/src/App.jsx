import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import CheckInPage from './pages/CheckInPage.jsx';
import ScanTokenPage from './pages/ScanTokenPage.jsx';
import GuestInvitePage from './pages/GuestInvitePage.jsx';
import OrganizerLayout from './pages/organizer/OrganizerLayout.jsx';
import GuestsPage from './pages/organizer/GuestsPage.jsx';
import InvitesPage from './pages/organizer/InvitesPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/my-invite" element={<GuestInvitePage />} />
        <Route
          path="/checkin"
          element={
            <ProtectedRoute roles={['organizer', 'security']}>
              <CheckInPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan/:token"
          element={
            <ProtectedRoute roles={['organizer', 'security']}>
              <ScanTokenPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute roles={['organizer']}>
              <OrganizerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<InvitesPage />} />
          <Route path="guests" element={<GuestsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
