import ui from './ui.module.css';

export function Loading({ label = 'Loading…' }) {
  return (
    <div className={ui.loading} role="status">
      <span className={ui.spinner} aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className={ui.error} role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className={`${ui.secondary} ${ui.small}`} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function SuccessMessage({ message }) {
  if (!message) return null;
  return (
    <div className={ui.success} role="status">
      {message}
    </div>
  );
}

export function Empty({ children }) {
  return <div className={ui.empty}>{children}</div>;
}

// Standard wrapper for a data view: spinner first time, error with retry, then the content.
// A failed background poll keeps the last good data on screen and shows the error above it.
export function DataView({ state, loadingLabel, children }) {
  if (state.loading && !state.data) return <Loading label={loadingLabel} />;
  if (!state.data) return <ErrorMessage message={state.error} onRetry={state.reload} />;
  return (
    <>
      {state.error && <ErrorMessage message={`Couldn't refresh: ${state.error}`} onRetry={state.reload} />}
      {children(state.data)}
    </>
  );
}
