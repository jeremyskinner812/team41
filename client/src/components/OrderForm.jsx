import { useState } from 'react';
import { ordersApi } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import { formatMoney } from '../utils/format.js';
import { estimateTotal } from '../utils/money.js';
import { ErrorMessage, SuccessMessage } from './DataState.jsx';
import ui from './ui.module.css';
import styles from './OrderForm.module.css';

const QUANTITY_PATTERN = /^[1-9]\d{0,6}$/;

// Collects the order, shows an estimate, asks for confirmation, then lets the API decide.
// Cash/share sufficiency and market hours are enforced by the server; its message is shown as-is.
export default function OrderForm({ stock, cash, sharesOwned, market, onPlaced }) {
  const [orderType, setOrderType] = useState('BUY');
  const [quantity, setQuantity] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const quantityValid = QUANTITY_PATTERN.test(quantity);
  const qty = quantityValid ? Number(quantity) : 0;
  const estimate = quantityValid ? estimateTotal(qty, stock.currentPrice) : null;
  const marketOpen = market?.isOpen === true;

  const reset = () => {
    setConfirming(false);
    setError(null);
  };

  const review = (event) => {
    event.preventDefault();
    setResult(null);
    setError(null);
    if (quantityValid) setConfirming(true);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const placed = await ordersApi.place({ ticker: stock.ticker, orderType, quantity: qty });
      setResult(placed);
      setQuantity('');
      onPlaced?.(placed);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  };

  const verb = orderType === 'BUY' ? 'Buy' : 'Sell';

  return (
    <div className={ui.formStack}>
      {result && (
        <SuccessMessage
          message={
            `${result.order.orderType === 'BUY' ? 'Bought' : 'Sold'} ${result.order.quantity} ${result.order.ticker} ` +
            `at ${formatMoney(result.order.price)} for ${formatMoney(result.order.total)}. ` +
            `Order #${result.order.orderId} ${result.order.status.toLowerCase()}. New cash balance ${formatMoney(result.balance)}.`
          }
        />
      )}
      <ErrorMessage message={error} />

      {!confirming ? (
        <form className={ui.formStack} onSubmit={review} noValidate>
          <div>
            <span className={styles.label} id="order-type-label">Order type</span>
            <div className={ui.segmented} role="group" aria-labelledby="order-type-label">
              {['BUY', 'SELL'].map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={orderType === type}
                  onClick={() => {
                    setOrderType(type);
                    reset();
                  }}
                >
                  {type === 'BUY' ? 'Buy' : 'Sell'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="quantity">Shares</label>
            <input
              id="quantity"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 10"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value.trim());
                setResult(null);
                reset();
              }}
              aria-invalid={quantity !== '' && !quantityValid ? 'true' : undefined}
              aria-describedby="quantity-help"
            />
            <div id="quantity-help" className={quantity !== '' && !quantityValid ? ui.fieldError : ui.muted}>
              {quantity !== '' && !quantityValid ? 'Enter a whole number of shares (1 or more).' : 'Whole shares only.'}
            </div>
          </div>

          <dl className={styles.summary}>
            <div><dt>Market price</dt><dd>{formatMoney(stock.currentPrice)}</dd></div>
            <div><dt>Available cash</dt><dd>{formatMoney(cash)}</dd></div>
            <div><dt>Shares owned</dt><dd>{sharesOwned.toLocaleString()}</dd></div>
            <div className={styles.total}>
              <dt>Estimated {orderType === 'BUY' ? 'cost' : 'proceeds'}</dt>
              <dd>{estimate ? formatMoney(estimate) : '—'}</dd>
            </div>
          </dl>

          {!marketOpen && market && (
            <div className={ui.warning}>Orders can't be placed right now: {market.reason ?? 'the market is closed'}.</div>
          )}

          <button type="submit" className={ui.button} disabled={!quantityValid || !marketOpen}>
            Review {verb.toLowerCase()} order
          </button>
        </form>
      ) : (
        <div className={styles.confirm} role="group" aria-labelledby="confirm-heading">
          <h3 id="confirm-heading">Confirm your order</h3>
          <p>
            {verb} <strong>{qty.toLocaleString()} {stock.ticker}</strong> at the market price, about{' '}
            <strong>{formatMoney(stock.currentPrice)}</strong> per share, for an estimated{' '}
            <strong>{formatMoney(estimate)}</strong>.
          </p>
          <p className={ui.muted}>
            Market orders fill at the price when the order executes, which can differ slightly from this estimate.
          </p>
          <div className={styles.confirmActions}>
            <button type="button" className={ui.secondary} onClick={reset} disabled={submitting}>
              Back
            </button>
            <button type="button" className={ui.button} onClick={submit} disabled={submitting}>
              {submitting ? 'Placing order…' : `Confirm ${verb.toLowerCase()}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
