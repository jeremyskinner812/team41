import { useEffect, useRef, useState } from 'react';
import { formatCompactMoney, formatCompactNumber, formatMoney } from '../utils/format.js';
import ui from './ui.module.css';
import styles from './StockTable.module.css';

const FLASH_MS = 1600;

// Remembers each ticker's last price and briefly marks it up/down when a poll brings a new one,
// so price movement is visible without reading every number.
function usePriceFlash(stocks) {
  const previous = useRef(new Map());
  const [flash, setFlash] = useState({});

  useEffect(() => {
    const changed = {};
    for (const s of stocks) {
      const before = previous.current.get(s.ticker);
      if (before !== undefined && before !== s.currentPrice) {
        changed[s.ticker] = Number(s.currentPrice) > Number(before) ? 'up' : 'down';
      }
      previous.current.set(s.ticker, s.currentPrice);
    }
    if (Object.keys(changed).length === 0) return undefined;
    setFlash(changed);
    const timer = setTimeout(() => setFlash({}), FLASH_MS);
    return () => clearTimeout(timer);
  }, [stocks]);

  return flash;
}

// Columns from the dashboard wireframe; `renderAction` adds an optional trailing column (e.g. Trade).
export default function StockTable({ stocks, renderAction, actionLabel = 'Action', caption }) {
  const flash = usePriceFlash(stocks);

  return (
    <div className={ui.tableWrap}>
      <table>
        {caption && <caption className="visually-hidden">{caption}</caption>}
        <thead>
          <tr>
            <th scope="col">Company</th>
            <th scope="col">Ticker</th>
            <th scope="col" className="num">Price</th>
            <th scope="col" className="num">Volume</th>
            <th scope="col" className="num">Market cap</th>
            <th scope="col" className="num">Open</th>
            <th scope="col" className="num">High</th>
            <th scope="col" className="num">Low</th>
            {renderAction && <th scope="col"><span className="visually-hidden">{actionLabel}</span></th>}
          </tr>
        </thead>
        <tbody>
          {stocks.map((s) => (
            <tr key={s.ticker}>
              <td className={styles.company}>{s.companyName}</td>
              <td><strong>{s.ticker}</strong></td>
              <td className={`num ${styles.price} ${flash[s.ticker] ? styles[flash[s.ticker]] : ''}`}>
                {formatMoney(s.currentPrice)}
                {flash[s.ticker] && (
                  <span className={styles.arrow} aria-hidden="true">{flash[s.ticker] === 'up' ? '▲' : '▼'}</span>
                )}
              </td>
              <td className="num" title={s.totalVolume.toLocaleString()}>{formatCompactNumber(s.totalVolume)}</td>
              <td className="num" title={formatMoney(s.marketCap)}>{formatCompactMoney(s.marketCap)}</td>
              <td className="num">{formatMoney(s.openingPrice)}</td>
              <td className="num">{formatMoney(s.dailyHigh)}</td>
              <td className="num">{formatMoney(s.dailyLow)}</td>
              {renderAction && <td className="num">{renderAction(s)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
