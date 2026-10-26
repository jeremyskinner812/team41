import { Link } from 'react-router-dom';
import { homePathFor, useAuth } from '../hooks/useAuth.js';
import ui from '../components/ui.module.css';

export default function NotFoundPage() {
  const { user } = useAuth();
  return (
    <div className={ui.card}>
      <h1>Page not found</h1>
      <p className={ui.muted}>There's nothing at this address.</p>
      <Link className={ui.button} to={homePathFor(user)}>Go to your home page</Link>
    </div>
  );
}
