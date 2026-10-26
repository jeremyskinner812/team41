import { useAuth } from '../hooks/useAuth.js';
import { ErrorMessage } from './DataState.jsx';
import ui from './ui.module.css';

// Shown when the session check couldn't reach the API, instead of pretending the user logged out.
export default function SessionError() {
  const { sessionError, checkSession } = useAuth();
  return (
    <div className={ui.centeredCard}>
      <h1>Can't reach EZ Trader</h1>
      <p className={ui.muted}>Your session couldn't be checked because the server didn't respond.</p>
      <ErrorMessage message={sessionError} onRetry={checkSession} />
    </div>
  );
}
