import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage, fieldErrors } from '../api/client.js';
import { homePathFor, useAuth } from '../hooks/useAuth.js';
import { ErrorMessage, Loading } from '../components/DataState.jsx';
import ui from '../components/ui.module.css';
import styles from './AuthPage.module.css';

const REGISTER_FIELDS = [
  { name: 'firstName', label: 'First name', autoComplete: 'given-name' },
  { name: 'lastName', label: 'Last name', autoComplete: 'family-name' },
  { name: 'username', label: 'Username', autoComplete: 'username', hint: '3–50 letters, numbers or underscores' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', hint: 'At least 8 characters' },
];

const LOGIN_FIELDS = [
  { name: 'username', label: 'Username', autoComplete: 'username' },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' },
];

// API error codes that belong to a specific field rather than the whole form.
const CODE_TO_FIELD = { USERNAME_TAKEN: 'username', EMAIL_TAKEN: 'email' };

// Client-side checks are only for quick feedback; the API validates everything again.
function requiredErrors(fields, values) {
  return Object.fromEntries(
    fields.filter((f) => !String(values[f.name] ?? '').trim()).map((f) => [f.name, `${f.label} is required`]),
  );
}

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const fields = isRegister ? REGISTER_FIELDS : LOGIN_FIELDS;
  const { user, checking, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (checking) return <Loading label="Checking your session…" />;
  if (user) return <Navigate to={homePathFor(user)} replace />;

  const update = (name) => (event) => {
    setValues((v) => ({ ...v, [name]: event.target.value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const missing = requiredErrors(fields, values);
    setErrors(missing);
    if (Object.keys(missing).length > 0) return;

    setSubmitting(true);
    try {
      const signedIn = isRegister ? await register(values) : await login(values.username, values.password);
      const from = location.state?.from;
      navigate(from && from !== '/' ? from : homePathFor(signedIn), { replace: true });
    } catch (err) {
      const byField = fieldErrors(err);
      const code = err?.response?.data?.error?.code;
      if (CODE_TO_FIELD[code]) byField[CODE_TO_FIELD[code]] = errorMessage(err);
      setErrors(byField);
      // Show the API's message at the top unless it's already attached to a field.
      if (Object.keys(byField).length === 0) setFormError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={`${ui.card} ${styles.card}`}>
        <div className={styles.brand}>EZ Trader</div>
        <h1>{isRegister ? 'Create your account' : 'Log in'}</h1>
        <p className={ui.muted}>
          {isRegister
            ? 'Open a simulated trading account. No real money involved.'
            : 'Welcome back. Log in to trade.'}
        </p>

        <form className={ui.formStack} onSubmit={handleSubmit} noValidate>
          <ErrorMessage message={formError} />
          <div className={isRegister ? styles.registerGrid : ui.formStack}>
            {fields.map((field) => (
              <div key={field.name} className={field.name === 'email' || field.name === 'password' || field.name === 'username' ? styles.full : undefined}>
                <label htmlFor={field.name}>{field.label}</label>
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type ?? 'text'}
                  autoComplete={field.autoComplete}
                  value={values[field.name] ?? ''}
                  onChange={update(field.name)}
                  aria-invalid={errors[field.name] ? 'true' : undefined}
                  aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
                  disabled={submitting}
                />
                {errors[field.name] ? (
                  <div id={`${field.name}-error`} className={ui.fieldError}>{errors[field.name]}</div>
                ) : (
                  isRegister && field.hint && <div className={ui.muted}>{field.hint}</div>
                )}
              </div>
            ))}
          </div>
          <button type="submit" className={ui.button} disabled={submitting}>
            {submitting ? (isRegister ? 'Creating account…' : 'Logging in…') : isRegister ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p className={styles.switch}>
          {isRegister ? (
            <>Already have an account? <Link to="/login">Log in</Link></>
          ) : (
            <>New to EZ Trader? <Link to="/register">Create an account</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
