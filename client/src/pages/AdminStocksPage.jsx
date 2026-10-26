import { useState } from 'react';
import { adminApi } from '../api/index.js';
import { errorCode, errorMessage, fieldErrors } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { DataView, Empty, ErrorMessage, SuccessMessage } from '../components/DataState.jsx';
import StockTable from '../components/StockTable.jsx';
import { formatMoney } from '../utils/format.js';
import { isMoneyInput } from '../utils/money.js';
import ui from '../components/ui.module.css';
import styles from './Page.module.css';

const EMPTY = { companyName: '', ticker: '', totalVolume: '', initialPrice: '' };

const FIELDS = [
  { name: 'companyName', label: 'Company name', placeholder: 'e.g. Netflix, Inc.' },
  { name: 'ticker', label: 'Ticker', placeholder: 'e.g. NFLX', hint: '1–5 letters, unique' },
  { name: 'totalVolume', label: 'Total volume (shares)', placeholder: 'e.g. 428000000', inputMode: 'numeric' },
  { name: 'initialPrice', label: 'Initial price (USD)', placeholder: 'e.g. 1215.40', inputMode: 'decimal' },
];

// Quick format checks so obvious typos are caught before a round trip; the API re-validates all of it.
function localErrors(values) {
  const errors = {};
  for (const f of FIELDS) if (!values[f.name].trim()) errors[f.name] = `${f.label} is required`;
  if (values.ticker.trim() && !/^[A-Za-z]{1,5}(\.[A-Za-z]{1,2})?$/.test(values.ticker.trim())) {
    errors.ticker = 'Use 1–5 letters, e.g. NFLX';
  }
  if (values.totalVolume.trim() && !/^[1-9]\d*$/.test(values.totalVolume.trim())) {
    errors.totalVolume = 'Enter a whole number of shares';
  }
  if (values.initialPrice.trim() && !isMoneyInput(values.initialPrice)) {
    errors.initialPrice = 'Enter a price like 25 or 25.50';
  }
  return errors;
}

function CreateStockForm({ onCreated }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
    setSuccess(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    const found = localErrors(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      const { stock } = await adminApi.createStock({
        companyName: values.companyName.trim(),
        ticker: values.ticker.trim(),
        totalVolume: values.totalVolume.trim(),
        initialPrice: values.initialPrice.trim(),
      });
      setSuccess(`Listed ${stock.ticker} (${stock.companyName}) at ${formatMoney(stock.currentPrice)}.`);
      setValues(EMPTY);
      onCreated();
    } catch (err) {
      const byField = fieldErrors(err);
      if (errorCode(err) === 'DUPLICATE_TICKER') byField.ticker = errorMessage(err);
      setErrors(byField);
      if (Object.keys(byField).length === 0) setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={ui.formStack} onSubmit={submit} noValidate>
      <ErrorMessage message={formError} />
      <SuccessMessage message={success} />
      <div className={ui.formRow}>
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label htmlFor={f.name}>{f.label}</label>
            <input
              id={f.name}
              value={values[f.name]}
              onChange={update(f.name)}
              placeholder={f.placeholder}
              inputMode={f.inputMode}
              autoComplete="off"
              aria-invalid={errors[f.name] ? 'true' : undefined}
              disabled={submitting}
            />
            {errors[f.name] ? (
              <div className={ui.fieldError}>{errors[f.name]}</div>
            ) : (
              f.hint && <div className={ui.muted}>{f.hint}</div>
            )}
          </div>
        ))}
      </div>
      <div>
        <button type="submit" className={ui.button} disabled={submitting}>
          {submitting ? 'Creating stock…' : 'Create stock'}
        </button>
      </div>
    </form>
  );
}

export default function AdminStocksPage() {
  const stocks = useApi(() => adminApi.listStocks().then((r) => r.stocks));

  return (
    <div className={ui.stack}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Stock management</h1>
          <p className={ui.muted}>List new stocks for customers to trade. Tickers must be unique.</p>
        </div>
      </div>

      <section className={ui.card} aria-labelledby="create-heading">
        <div className={ui.cardHeader}>
          <h2 id="create-heading">Create a stock</h2>
        </div>
        <CreateStockForm onCreated={stocks.reload} />
      </section>

      <section className={ui.card} aria-labelledby="listed-heading">
        <div className={ui.cardHeader}>
          <h2 id="listed-heading">Listed stocks</h2>
          {stocks.data && <span className={ui.muted}>{stocks.data.length} stocks</span>}
        </div>
        <DataView state={stocks} loadingLabel="Loading stocks…">
          {(list) => (list.length === 0 ? <Empty>No stocks listed yet.</Empty> : <StockTable stocks={list} caption="Listed stocks" />)}
        </DataView>
      </section>
    </div>
  );
}
