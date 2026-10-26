import { useMarketStatus } from '../hooks/useMarketStatus.js';
import { formatMarketTime } from '../utils/format.js';
import styles from './MarketStatusBadge.module.css';

export default function MarketStatusBadge() {
  const { data, error, loading } = useMarketStatus();

  if (loading && !data) {
    return <span className={`${styles.badge} ${styles.unknown}`}>Checking market…</span>;
  }
  if (!data) {
    return (
      <span className={`${styles.badge} ${styles.unknown}`} title={error ?? undefined}>
        Market status unavailable
      </span>
    );
  }

  const detail = data.isOpen
    ? `closes ${formatMarketTime(data.closesAt, data.timezone)}`
    : data.opensAt
      ? `opens ${formatMarketTime(data.opensAt, data.timezone, { withDay: true })}`
      : data.reason;

  return (
    <span
      className={`${styles.badge} ${data.isOpen ? styles.open : styles.closed}`}
      title={data.reason ?? undefined}
      aria-live="polite"
    >
      <span className={styles.dot} aria-hidden="true" />
      <strong>{data.isOpen ? 'Market open' : 'Market closed'}</strong>
      <span className={styles.detail}>· {detail}</span>
    </span>
  );
}
