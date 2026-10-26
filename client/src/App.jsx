import { Navigate, Route, Routes } from 'react-router-dom';
import { homePathFor, useAuth } from './hooks/useAuth.js';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { Loading } from './components/DataState.jsx';
import SessionError from './components/SessionError.jsx';
import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TradePage from './pages/TradePage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import CashPage from './pages/CashPage.jsx';
import AdminStocksPage from './pages/AdminStocksPage.jsx';
import AdminMarketPage from './pages/AdminMarketPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function HomeRedirect() {
  const { user, checking, sessionError } = useAuth();
  if (checking) return <Loading label="Checking your session…" />;
  if (!user && sessionError) return <SessionError />;
  return <Navigate to={user ? homePathFor(user) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route element={<ProtectedRoute roles={['customer']} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/trade" element={<TradePage />} />
            <Route path="/trade/:ticker" element={<TradePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/cash" element={<CashPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin/stocks" element={<AdminStocksPage />} />
            <Route path="/admin/market" element={<AdminMarketPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
