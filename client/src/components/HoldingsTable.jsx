import { Link } from 'react-router-dom';
import { formatMoney, signClass } from '../utils/format.js';
import ui from './ui.module.css';

export default function HoldingsTable({ holdings }) {
  return (
    <div className={ui.tableWrap}>
      <table>
        <caption className="visually-hidden">Your holdings</caption>
        <thead>
          <tr>
            <th scope="col">Stock</th>
            <th scope="col" className="num">Shares</th>
            <th scope="col" className="num">Avg cost</th>
            <th scope="col" className="num">Price</th>
            <th scope="col" className="num">Current value</th>
            <th scope="col" className="num">Gain / loss</th>
            <th scope="col"><span className="visually-hidden">Trade</span></th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.ticker}>
              <td>
                <strong>{h.ticker}</strong> <span className={ui.muted}>{h.companyName}</span>
              </td>
              <td className="num">{h.quantity.toLocaleString()}</td>
              <td className="num">{formatMoney(h.averageCost)}</td>
              <td className="num">{formatMoney(h.currentPrice)}</td>
              <td className="num"><strong>{formatMoney(h.marketValue)}</strong></td>
              <td className={`num ${signClass(h.gainLoss, ui)}`}>
                {formatMoney(h.gainLoss)} ({h.gainLossPct}%)
              </td>
              <td className="num">
                <Link className={`${ui.secondary} ${ui.small}`} to={`/trade/${h.ticker}`}>Trade</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
