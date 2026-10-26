import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { usePortfolio, useStocks } from '../hooks/useLiveData.js';
import { DataView, Empty } from '../components/DataState.jsx';
import PortfolioSummary from '../components/PortfolioSummary.jsx';
import HoldingsTable from '../components/HoldingsTable.jsx';
import StockTable from '../components/StockTable.jsx';
import ui from '../components/ui.module.css';
import styles from './Page.module.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const portfolio = usePortfolio();
  const stocks = useStocks();

  return (
    <div className={ui.stack}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Hi, {user.firstName}</h1>
          <p className={ui.muted}>Your portfolio and today's market. Prices refresh every 15 seconds.</p>
        </div>
        <div className={styles.actions}>
          <Link className={ui.secondary} to="/cash">Deposit cash</Link>
          <Link className={ui.button} to="/trade">Buy / sell</Link>
        </div>
      </div>

      <DataView state={portfolio} loadingLabel="Loading your portfolio…">
        {(p) => (
          <>
            <PortfolioSummary portfolio={p} />
            <section className={ui.card} aria-labelledby="holdings-heading">
              <div className={ui.cardHeader}>
                <h2 id="holdings-heading">Your holdings</h2>
                <span className={ui.muted}>{p.holdings.length} {p.holdings.length === 1 ? 'position' : 'positions'}</span>
              </div>
              {p.holdings.length === 0 ? (
                <Empty>
                  You don't own any stocks yet. {p.cash === '0.00' ? <Link to="/cash">Deposit cash</Link> : <Link to="/trade">Buy your first stock</Link>} to get started.
                </Empty>
              ) : (
                <HoldingsTable holdings={p.holdings} />
              )}
            </section>
          </>
        )}
      </DataView>

      <section className={ui.card} aria-labelledby="stocks-heading">
        <div className={ui.cardHeader}>
          <h2 id="stocks-heading">Available stocks</h2>
        </div>
        <DataView state={stocks} loadingLabel="Loading stocks…">
          {(list) =>
            list.length === 0 ? (
              <Empty>No stocks are listed yet.</Empty>
            ) : (
              <StockTable
                stocks={list}
                caption="Available stocks"
                actionLabel="Trade"
                renderAction={(s) => (
                  <Link className={`${ui.secondary} ${ui.small}`} to={`/trade/${s.ticker}`}>Trade</Link>
                )}
              />
            )
          }
        </DataView>
      </section>
    </div>
  );
}
