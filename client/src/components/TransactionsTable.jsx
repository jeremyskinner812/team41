import { formatDateTime, formatMoney } from '../utils/format.js';
import { TransactionTypePill } from './StatusPill.jsx';
import ui from './ui.module.css';

// Cash moves in (+) for deposits and sales, out (−) for withdrawals and purchases.
const CASH_IN = new Set(['DEPOSIT', 'SELL']);

export default function TransactionsTable({ transactions, caption = 'Transactions' }) {
  return (
    <div className={ui.tableWrap}>
      <table>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Type</th>
            <th scope="col">Details</th>
            <th scope="col" className="num">Cash</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const incoming = CASH_IN.has(t.transactionType);
            return (
              <tr key={t.transactionId}>
                <td>{formatDateTime(t.transactionTime)}</td>
                <td><TransactionTypePill type={t.transactionType} /></td>
                <td>
                  {t.ticker
                    ? `${t.quantity.toLocaleString()} ${t.ticker} @ ${formatMoney(t.price)} · order #${t.orderId}`
                    : <span className={ui.muted}>Cash {t.transactionType === 'DEPOSIT' ? 'deposit' : 'withdrawal'}</span>}
                </td>
                <td className={`num ${incoming ? ui.positive : ui.negative}`}>
                  {incoming ? '+' : '−'}{formatMoney(t.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
