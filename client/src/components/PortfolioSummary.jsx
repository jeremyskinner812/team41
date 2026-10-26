import { formatMoney, signClass } from '../utils/format.js';
import ui from './ui.module.css';
import styles from './PortfolioSummary.module.css';

// Headline numbers straight from GET /api/portfolio; nothing is recomputed here.
export default function PortfolioSummary({ portfolio }) {
  const tiles = [
    { label: 'Total portfolio value', value: formatMoney(portfolio.totalValue), emphasis: true },
    { label: 'Cash balance', value: formatMoney(portfolio.cash) },
    { label: 'Holdings value', value: formatMoney(portfolio.holdingsValue) },
    {
      label: 'Unrealized gain / loss',
      value: formatMoney(portfolio.gainLoss),
      className: signClass(portfolio.gainLoss, ui),
    },
  ];

  return (
    <div className={styles.grid}>
      {tiles.map((tile) => (
        <div key={tile.label} className={`${ui.card} ${styles.tile} ${tile.emphasis ? styles.emphasis : ''}`}>
          <div className={ui.muted}>{tile.label}</div>
          <div className={`${styles.value} ${tile.className ?? ''}`}>{tile.value}</div>
        </div>
      ))}
    </div>
  );
}
