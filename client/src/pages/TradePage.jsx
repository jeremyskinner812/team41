import { useNavigate, useParams } from 'react-router-dom';
import { useMarketStatus } from '../hooks/useMarketStatus.js';
import { usePortfolio, useStocks } from '../hooks/useLiveData.js';
import { DataView, Empty } from '../components/DataState.jsx';
import OrderForm from '../components/OrderForm.jsx';
import { formatCompactMoney, formatCompactNumber, formatMarketTime, formatMoney } from '../utils/format.js';
import ui from '../components/ui.module.css';
import styles from './Page.module.css';

function Quote({ stock, market }) {
  return (
    <section className={ui.card} aria-labelledby="quote-heading">
      <div className={ui.cardHeader}>
        <div>
          <h2 id="quote-heading">{stock.ticker}</h2>
          <div className={ui.muted}>{stock.companyName}</div>
        </div>
        {market && (
          <span className={market.isOpen ? ui.pillPositive : ui.pillNegative}>
            {market.isOpen ? `Open until ${formatMarketTime(market.closesAt, market.timezone)}` : 'Market closed'}
          </span>
        )}
      </div>
      <div className={styles.bigPrice}>{formatMoney(stock.currentPrice)}</div>
      <dl className={styles.statList}>
        <div><dt>Open</dt><dd>{formatMoney(stock.openingPrice)}</dd></div>
        <div><dt>Day high</dt><dd>{formatMoney(stock.dailyHigh)}</dd></div>
        <div><dt>Day low</dt><dd>{formatMoney(stock.dailyLow)}</dd></div>
        <div><dt>Volume</dt><dd>{formatCompactNumber(stock.totalVolume)}</dd></div>
        <div><dt>Market cap</dt><dd>{formatCompactMoney(stock.marketCap)}</dd></div>
      </dl>
      {market && !market.isOpen && <p className={ui.muted}>{market.reason}</p>}
    </section>
  );
}

export default function TradePage() {
  const { ticker } = useParams();
  const navigate = useNavigate();
  const stocks = useStocks();
  const portfolio = usePortfolio();
  const { data: market } = useMarketStatus();

  const refreshAfterOrder = () => {
    portfolio.reload();
    stocks.reload();
  };

  return (
    <div className={ui.stack}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Buy / sell stock</h1>
          <p className={ui.muted}>Market orders execute immediately at the current price.</p>
        </div>
      </div>

      <DataView state={stocks} loadingLabel="Loading stocks…">
        {(list) => {
          if (list.length === 0) return <Empty>No stocks are listed yet.</Empty>;
          const selected = list.find((s) => s.ticker === ticker?.toUpperCase());
          return (
            <>
              <div className={ui.card}>
                <label htmlFor="stock-picker">Stock</label>
                <select
                  id="stock-picker"
                  value={selected?.ticker ?? ''}
                  onChange={(e) => navigate(`/trade/${e.target.value}`)}
                >
                  <option value="" disabled>Choose a stock…</option>
                  {list.map((s) => (
                    <option key={s.ticker} value={s.ticker}>
                      {s.ticker} · {s.companyName} · {formatMoney(s.currentPrice)}
                    </option>
                  ))}
                </select>
                {ticker && !selected && <p className={ui.fieldError}>No stock with ticker {ticker.toUpperCase()}.</p>}
              </div>

              {selected && (
                <div className={styles.split}>
                  <Quote stock={selected} market={market} />
                  <section className={ui.card} aria-labelledby="order-heading">
                    <div className={ui.cardHeader}>
                      <h2 id="order-heading">Place an order</h2>
                    </div>
                    <DataView state={portfolio} loadingLabel="Loading your balances…">
                      {(p) => (
                        <OrderForm
                          key={selected.ticker}
                          stock={selected}
                          cash={p.cash}
                          sharesOwned={p.holdings.find((h) => h.ticker === selected.ticker)?.quantity ?? 0}
                          market={market}
                          onPlaced={refreshAfterOrder}
                        />
                      )}
                    </DataView>
                  </section>
                </div>
              )}
            </>
          );
        }}
      </DataView>
    </div>
  );
}
