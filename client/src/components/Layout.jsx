import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { MarketStatusProvider } from '../context/MarketStatusContext.jsx';
import MarketStatusBadge from './MarketStatusBadge.jsx';
import styles from './Layout.module.css';

const NAV = {
  customer: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/trade', label: 'Trade' },
    { to: '/history', label: 'Orders & History' },
    { to: '/cash', label: 'Cash' },
  ],
  admin: [
    { to: '/admin/stocks', label: 'Stocks' },
    { to: '/admin/market', label: 'Market Settings' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const links = NAV[user.role] ?? [];

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <MarketStatusProvider>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <NavLink to="/" className={styles.brand}>
              EZ Trader{user.role === 'admin' && <span className={styles.roleTag}>Admin</span>}
            </NavLink>

            <button
              type="button"
              className={styles.menuToggle}
              aria-expanded={menuOpen}
              aria-controls="main-nav"
              onClick={() => setMenuOpen((open) => !open)}
            >
              Menu
            </button>

            <nav id="main-nav" className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`} aria-label="Main">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className={styles.right}>
              <MarketStatusBadge />
              <span className={styles.user} title={user.email}>
                {user.firstName} {user.lastName}
              </span>
              <button type="button" className={styles.logout} onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </div>
          </div>
        </header>

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </MarketStatusProvider>
  );
}
