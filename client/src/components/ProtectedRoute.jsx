import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homePathFor, useAuth } from '../hooks/useAuth.js';
import { Loading } from './DataState.jsx';
import SessionError from './SessionError.jsx';

// Gate for authenticated routes. `roles` limits a branch to customers or admins; the API enforces
// the same rule, this just keeps people off pages they can't use.
export default function ProtectedRoute({ roles }) {
  const { user, checking, sessionError } = useAuth();
  const location = useLocation();

  if (checking) return <Loading label="Checking your session…" />;
  // The API is unreachable: say so instead of bouncing a logged-in user to the login page.
  if (!user && sessionError) return <SessionError />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user)} replace />;
  return <Outlet />;
}
