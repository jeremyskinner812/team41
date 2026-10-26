import ui from './ui.module.css';

const ORDER_STATUS = { FILLED: ui.pillPositive, PENDING: ui.pillWarning, CANCELLED: ui.pill };
const TRANSACTION_TYPE = { BUY: ui.pill, SELL: ui.pill, DEPOSIT: ui.pillPositive, WITHDRAWAL: ui.pillNegative };

export function OrderStatusPill({ status }) {
  return <span className={ORDER_STATUS[status] ?? ui.pill}>{status}</span>;
}

export function TransactionTypePill({ type }) {
  return <span className={TRANSACTION_TYPE[type] ?? ui.pill}>{type}</span>;
}
