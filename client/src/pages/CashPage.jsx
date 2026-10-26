import { useState } from 'react';
import { cashApi, portfolioApi } from '../api/index.js';
import { errorMessage, fieldErrors } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { DataView, Empty, ErrorMessage, SuccessMessage } from '../components/DataState.jsx';
import TransactionsTable from '../components/TransactionsTable.jsx';
import { formatMoney } from '../utils/format.js';
import { isMoneyInput } from '../utils/money.js';
import ui from '../components/ui.module.css';
import styles from './Page.module.css';

const CASH_TYPES = new Set(['DEPOSIT', 'WITHDRAWAL']);
const RECENT_LIMIT = 10;

function CashForm({ balance, onDone }) {
  const [action, setAction] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const trimmed = amount.trim();
  const formatError = trimmed !== '' && !isMoneyInput(trimmed) ? 'Enter an amount like 250 or 250.50.' : null;

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!trimmed || formatError) {
      setError(formatError ?? 'Enter an amount.');
      return;
    }
    setSubmitting(true);
    try {
      const result = action === 'deposit' ? await cashApi.deposit(trimmed) : await cashApi.withdraw(trimmed);
      setSuccess(
        `${action === 'deposit' ? 'Deposited' : 'Withdrew'} ${formatMoney(result.transaction.amount)}. ` +
          `New balance ${formatMoney(result.balance)}.`,
      );
      setAmount('');
      onDone();
    } catch (err) {
      // The API explains over-withdrawals ("your available balance is …"); show that verbatim.
      setError(fieldErrors(err).amount ?? errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={ui.formStack} onSubmit={submit} noValidate>
      <div className={ui.segmented} role="group" aria-label="Deposit or withdraw">
        {['deposit', 'withdraw'].map((a) => (
          <button
            key={a}
            type="button"
            aria-pressed={action === a}
            onClick={() => {
              setAction(a);
              setError(null);
              setSuccess(null);
            }}
          >
            {a === 'deposit' ? 'Deposit' : 'Withdraw'}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="amount">Amount (USD)</label>
        <input
          id="amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError(null);
            setSuccess(null);
          }}
          aria-invalid={formatError ? 'true' : undefined}
          aria-describedby="amount-help"
          disabled={submitting}
        />
        <div id="amount-help" className={formatError ? ui.fieldError : ui.muted}>
          {formatError ?? (action === 'withdraw' ? `Available to withdraw: ${formatMoney(balance)}` : 'Up to $1,000,000.00 per deposit.')}
        </div>
      </div>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      <button type="submit" className={ui.button} disabled={submitting || !trimmed || Boolean(formatError)}>
        {submitting ? 'Processing…' : action === 'deposit' ? 'Deposit cash' : 'Withdraw cash'}
      </button>
    </form>
  );
}

export default function CashPage() {
  const balance = useApi(cashApi.balance);
  const activity = useApi(() => portfolioApi.transactions({ limit: 200 }).then((r) => r.transactions));

  const refresh = () => {
    balance.reload();
    activity.reload();
  };

  return (
    <div className={ui.stack}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Cash management</h1>
          <p className={ui.muted}>Deposit cash to trade with. Sale proceeds land here and can be withdrawn.</p>
        </div>
      </div>

      <div className={styles.splitWide}>
        <section className={ui.card} aria-labelledby="balance-heading">
          <h2 id="balance-heading">Cash balance</h2>
          <DataView state={balance} loadingLabel="Loading balance…">
            {(b) => (
              <>
                <div className={styles.bigPrice}>{formatMoney(b.balance)}</div>
                <CashForm balance={b.balance} onDone={refresh} />
              </>
            )}
          </DataView>
        </section>

        <section className={ui.card} aria-labelledby="activity-heading">
          <div className={ui.cardHeader}>
            <h2 id="activity-heading">Recent cash activity</h2>
          </div>
          <DataView state={activity} loadingLabel="Loading activity…">
            {(list) => {
              const cashOnly = list.filter((t) => CASH_TYPES.has(t.transactionType)).slice(0, RECENT_LIMIT);
              return cashOnly.length === 0 ? (
                <Empty>No deposits or withdrawals yet.</Empty>
              ) : (
                <TransactionsTable transactions={cashOnly} caption="Recent deposits and withdrawals" />
              );
            }}
          </DataView>
        </section>
      </div>
    </div>
  );
}
