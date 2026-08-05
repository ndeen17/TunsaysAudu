import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import ScannerPage from './pages/ScannerPage.jsx';
import OrganizerLayout from './pages/organizer/OrganizerLayout.jsx';
import GuestsPage from './pages/organizer/GuestsPage.jsx';
import InvitesPage from './pages/organizer/InvitesPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/scanner"
          element={
            <ProtectedRoute roles={['organizer', 'security']}>
              <ScannerPage />
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
