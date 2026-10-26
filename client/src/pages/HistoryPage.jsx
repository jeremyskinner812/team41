import { useState } from 'react';
import { ordersApi, portfolioApi } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { DataView, Empty, ErrorMessage, SuccessMessage } from '../components/DataState.jsx';
import { OrderStatusPill } from '../components/StatusPill.jsx';
import TransactionsTable from '../components/TransactionsTable.jsx';
import { formatDateTime, formatMoney } from '../utils/format.js';
import ui from '../components/ui.module.css';
import styles from './Page.module.css';

const TYPE_FILTERS = [
  { value: '', label: 'All activity' },
  { value: 'BUY', label: 'Buys' },
  { value: 'SELL', label: 'Sells' },
  { value: 'DEPOSIT', label: 'Deposits' },
  { value: 'WITHDRAWAL', label: 'Withdrawals' },
];

// Cancel lives only on PENDING rows; the API rejects cancelling anything else regardless.
function CancelOrderButton({ order, onCancelled, onError }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (order.status !== 'PENDING') return null;

  const cancel = async () => {
    setBusy(true);
    try {
      await ordersApi.cancel(order.orderId);
      onCancelled(order);
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <button type="button" className={`${ui.secondary} ${ui.small}`} onClick={() => setConfirming(true)}>
        Cancel
      </button>
    );
  }
  return (
    <span className={styles.actions}>
      <button type="button" className={`${ui.danger} ${ui.small}`} onClick={cancel} disabled={busy}>
        {busy ? 'Cancelling…' : 'Yes, cancel'}
      </button>
      <button type="button" className={`${ui.secondary} ${ui.small}`} onClick={() => setConfirming(false)} disabled={busy}>
        Keep
      </button>
    </span>
  );
}

function OrdersTable({ orders, onCancelled, onError, caption }) {
  return (
    <div className={ui.tableWrap}>
      <table>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Placed</th>
            <th scope="col">Side</th>
            <th scope="col">Stock</th>
            <th scope="col" className="num">Shares</th>
            <th scope="col" className="num">Price</th>
            <th scope="col" className="num">Total</th>
            <th scope="col">Status</th>
            <th scope="col"><span className="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.orderId}>
              <td>#{o.orderId}</td>
              <td>{formatDateTime(o.orderTime)}</td>
              <td><strong>{o.orderType}</strong></td>
              <td>{o.ticker}</td>
              <td className="num">{o.quantity.toLocaleString()}</td>
              <td className="num">{formatMoney(o.price)}</td>
              <td className="num">{formatMoney(o.total)}</td>
              <td><OrderStatusPill status={o.status} /></td>
              <td><CancelOrderButton order={o} onCancelled={onCancelled} onError={onError} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HistoryPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const orders = useApi(() => ordersApi.list().then((r) => r.orders));
  const transactions = useApi(
    () => portfolioApi.transactions({ limit: 200, ...(typeFilter ? { type: typeFilter } : {}) }).then((r) => r.transactions),
    { deps: [typeFilter] },
  );
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  const handleCancelled = (order) => {
    setActionError(null);
    setNotice(`Order #${order.orderId} was cancelled.`);
    orders.reload();
  };
  const handleError = (message) => {
    setNotice(null);
    setActionError(message);
    orders.reload();
  };

  return (
    <div className={ui.stack}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Orders &amp; transaction history</h1>
          <p className={ui.muted}>Pending orders can be cancelled. Filled orders are final.</p>
        </div>
      </div>

      <SuccessMessage message={notice} />
      <ErrorMessage message={actionError} />

      <DataView state={orders} loadingLabel="Loading orders…">
        {(list) => {
          const pending = list.filter((o) => o.status === 'PENDING');
          return (
            <>
              <section className={ui.card} aria-labelledby="pending-heading">
                <div className={ui.cardHeader}>
                  <h2 id="pending-heading">Pending orders</h2>
                  <span className={ui.muted}>{pending.length} pending</span>
                </div>
                {pending.length === 0 ? (
                  <Empty>No pending orders. Market orders usually fill as soon as they're placed.</Empty>
                ) : (
                  <OrdersTable orders={pending} onCancelled={handleCancelled} onError={handleError} caption="Pending orders" />
                )}
              </section>

              <section className={ui.card} aria-labelledby="orders-heading">
                <div className={ui.cardHeader}>
                  <h2 id="orders-heading">All orders</h2>
                  <span className={ui.muted}>{list.length} total</span>
                </div>
                {list.length === 0 ? (
                  <Empty>You haven't placed any orders yet.</Empty>
                ) : (
                  <OrdersTable orders={list} onCancelled={handleCancelled} onError={handleError} caption="All orders" />
                )}
              </section>
            </>
          );
        }}
      </DataView>

      <section className={ui.card} aria-labelledby="transactions-heading">
        <div className={ui.cardHeader}>
          <h2 id="transactions-heading">Transactions</h2>
          <div>
            <label htmlFor="type-filter" className="visually-hidden">Filter by type</label>
            <select id="type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {TYPE_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>
        <DataView state={transactions} loadingLabel="Loading transactions…">
          {(list) =>
            list.length === 0 ? (
              <Empty>No {typeFilter ? TYPE_FILTERS.find((f) => f.value === typeFilter).label.toLowerCase() : 'transactions'} yet.</Empty>
            ) : (
              <TransactionsTable transactions={list} />
            )
          }
        </DataView>
      </section>
    </div>
  );
}
