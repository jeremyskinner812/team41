import { useState } from 'react';
import { adminApi } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useMarketStatus } from '../hooks/useMarketStatus.js';
import { DataView, Empty, ErrorMessage, SuccessMessage } from '../components/DataState.jsx';
import { formatDateOnly } from '../utils/format.js';
import ui from '../components/ui.module.css';
import pageStyles from './Page.module.css';
import styles from './AdminMarketPage.module.css';

const WEEKDAYS = [
  { code: 'MON', label: 'Monday' },
  { code: 'TUE', label: 'Tuesday' },
  { code: 'WED', label: 'Wednesday' },
  { code: 'THU', label: 'Thursday' },
  { code: 'FRI', label: 'Friday' },
  { code: 'SAT', label: 'Saturday' },
  { code: 'SUN', label: 'Sunday' },
];

// Shared submit plumbing for both forms: in-flight flag, API error, success text.
function useSave(onSaved) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const run = async (request, message) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await request();
      setSuccess(message);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return { saving, error, success, run, clear: () => { setError(null); setSuccess(null); } };
}

function HoursForm({ settings, onSaved }) {
  const [openingTime, setOpeningTime] = useState(settings.openingTime);
  const [closingTime, setClosingTime] = useState(settings.closingTime);
  const save = useSave(onSaved);

  const submit = (event) => {
    event.preventDefault();
    save.run(() => adminApi.updateHours(openingTime, closingTime), `Trading hours set to ${openingTime}–${closingTime} CT.`);
  };

  return (
    <form className={ui.formStack} onSubmit={submit} noValidate>
      <div className={ui.formRow}>
        <div>
          <label htmlFor="openingTime">Opening time (CT)</label>
          <input id="openingTime" type="time" step="60" required value={openingTime}
            onChange={(e) => { setOpeningTime(e.target.value); save.clear(); }} disabled={save.saving} />
        </div>
        <div>
          <label htmlFor="closingTime">Closing time (CT)</label>
          <input id="closingTime" type="time" step="60" required value={closingTime}
            onChange={(e) => { setClosingTime(e.target.value); save.clear(); }} disabled={save.saving} />
        </div>
      </div>
      <p className={ui.muted}>Applies from today onward. Past trading days keep the hours they traded under.</p>
      <ErrorMessage message={save.error} />
      <SuccessMessage message={save.success} />
      <div>
        <button type="submit" className={ui.button} disabled={save.saving || !openingTime || !closingTime}>
          {save.saving ? 'Saving hours…' : 'Save hours'}
        </button>
      </div>
    </form>
  );
}

function ScheduleForm({ settings, onSaved }) {
  const [tradingDays, setTradingDays] = useState(new Set(settings.tradingDays));
  const [holidays, setHolidays] = useState(settings.holidays);
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState(null);
  const save = useSave(onSaved);

  const toggleDay = (code) => {
    save.clear();
    setTradingDays((days) => {
      const next = new Set(days);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const addHoliday = () => {
    setAddError(null);
    save.clear();
    if (!newDate || !newName.trim()) {
      setAddError('Pick a date and enter a name for the holiday.');
      return;
    }
    if (holidays.some((h) => h.date === newDate)) {
      setAddError(`${formatDateOnly(newDate)} is already in the list.`);
      return;
    }
    setHolidays((list) => [...list, { date: newDate, name: newName.trim() }].sort((a, b) => a.date.localeCompare(b.date)));
    setNewDate('');
    setNewName('');
  };

  const removeHoliday = (date) => {
    save.clear();
    setHolidays((list) => list.filter((h) => h.date !== date));
  };

  const submit = (event) => {
    event.preventDefault();
    const days = WEEKDAYS.map((d) => d.code).filter((code) => tradingDays.has(code));
    save.run(() => adminApi.updateSchedule(days, holidays), 'Trading days and holidays saved.');
  };

  return (
    <form className={ui.formStack} onSubmit={submit} noValidate>
      <fieldset className={styles.fieldset} disabled={save.saving}>
        <legend>Trading weekdays</legend>
        <div className={styles.days}>
          {WEEKDAYS.map((d) => (
            <label key={d.code} className={styles.day}>
              <input type="checkbox" checked={tradingDays.has(d.code)} onChange={() => toggleDay(d.code)} />
              {d.label}
            </label>
          ))}
        </div>
        {tradingDays.size === 0 && (
          <div className={ui.warning}>With no trading days selected, the market stays closed.</div>
        )}
      </fieldset>

      <fieldset className={styles.fieldset} disabled={save.saving}>
        <legend>Holidays (market closed)</legend>
        {holidays.length === 0 ? (
          <Empty>No upcoming holidays.</Empty>
        ) : (
          <ul className={styles.holidays}>
            {holidays.map((h) => (
              <li key={h.date}>
                <span><strong>{formatDateOnly(h.date)}</strong> · {h.name}</span>
                <button type="button" className={`${ui.secondary} ${ui.small}`} onClick={() => removeHoliday(h.date)}
                  aria-label={`Remove ${h.name} on ${formatDateOnly(h.date)}`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.addRow}>
          <div>
            <label htmlFor="holidayDate">Date</label>
            <input id="holidayDate" type="date" value={newDate} onChange={(e) => { setNewDate(e.target.value); setAddError(null); }} />
          </div>
          <div className={styles.grow}>
            <label htmlFor="holidayName">Name</label>
            <input id="holidayName" value={newName} maxLength={100} placeholder="e.g. Christmas Day"
              onChange={(e) => { setNewName(e.target.value); setAddError(null); }} />
          </div>
          <button type="button" className={ui.secondary} onClick={addHoliday}>Add holiday</button>
        </div>
        {addError && <div className={ui.fieldError}>{addError}</div>}
      </fieldset>

      <ErrorMessage message={save.error} />
      <SuccessMessage message={save.success} />
      <div>
        <button type="submit" className={ui.button} disabled={save.saving}>
          {save.saving ? 'Saving schedule…' : 'Save schedule'}
        </button>
      </div>
    </form>
  );
}

export default function AdminMarketPage() {
  const settings = useApi(adminApi.marketSettings);
  const market = useMarketStatus();

  // After a save, re-read the settings and refresh the header badge right away.
  const handleSaved = () => {
    settings.reload();
    market.reload();
  };

  return (
    <div className={ui.stack}>
      <div className={pageStyles.pageHeader}>
        <div>
          <h1>Market settings</h1>
          <p className={ui.muted}>All times are America/Chicago (CT). Orders are accepted only while the market is open.</p>
        </div>
      </div>

      <DataView state={settings} loadingLabel="Loading market settings…">
        {(s) => (
          <div className={pageStyles.split}>
            <section className={ui.card} aria-labelledby="hours-heading">
              <div className={ui.cardHeader}>
                <h2 id="hours-heading">Trading hours</h2>
              </div>
              <HoursForm settings={s} onSaved={handleSaved} />
            </section>
            <section className={ui.card} aria-labelledby="schedule-heading">
              <div className={ui.cardHeader}>
                <h2 id="schedule-heading">Schedule</h2>
                {s.scheduledThrough && <span className={ui.muted}>Scheduled through {formatDateOnly(s.scheduledThrough)}</span>}
              </div>
              <ScheduleForm settings={s} onSaved={handleSaved} />
            </section>
          </div>
        )}
      </DataView>
    </div>
  );
}
