/**
 * DateSlider — Temporal Cursor for Stock Projection
 * ===================================================
 *
 * A date range slider that allows projecting stock status forward/backward
 * in time. Derived from the SICAM "Stock Glissant" dashboard design.
 *
 * Props:
 *   offsetDays  — Current offset value (number, -15 to +45)
 *   onChange    — Callback with the new offset value
 *   projectedDate — Date object for the projected date
 */

import { useMemo } from 'react';

/* ── Helpers ── */
const fmtDate = (d) => {
  if (!d) return '';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

/**
 * DateSlider Component
 * Shows a range slider with a projected date badge and time labels.
 */
const DateSlider = ({ offsetDays = 0, onChange, projectedDate }) => {
  const today = new Date();
  const isToday = offsetDays === 0;

  const badgeText = useMemo(() => {
    if (isToday) return "Aujourd'hui";
    const sign = offsetDays > 0 ? '+' : '';
    return `${sign}${offsetDays}j — ${fmtDate(projectedDate)}`;
  }, [offsetDays, projectedDate, isToday]);

  return (
    <div style={{
      background: 'white',
      padding: '20px 28px',
      borderBottom: '2px solid #e8e8e8',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.95rem',
          fontWeight: 700,
          color: '#333',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D50010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Curseur temporel — projection du stock
        </div>
        <div style={{
          background: isToday ? '#D50010' : '#EE9D01',
          color: 'white',
          padding: '6px 18px',
          borderRadius: '20px',
          fontSize: '0.9rem',
          fontWeight: 700,
          minWidth: '160px',
          textAlign: 'center',
          transition: 'all 0.25s ease',
        }}>
          {badgeText}
        </div>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{ fontSize: '0.78rem', color: '#888', whiteSpace: 'nowrap' }}>J-15</span>
        <input
          type="range"
          min={-15}
          max={45}
          value={offsetDays}
          step={1}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          aria-label="Curseur temporel — projeter le stock"
          style={{
            flex: 1,
            height: '6px',
            accentColor: '#D50010',
            cursor: 'pointer',
            border: 'none',
            padding: 0,
          }}
        />
        <span style={{ fontSize: '0.78rem', color: '#888', whiteSpace: 'nowrap' }}>J+45</span>
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '6px',
        fontSize: '0.72rem',
        color: '#aaa',
        padding: '0 2px',
      }}>
        <span>Passé</span>
        <span>Aujourd'hui</span>
        <span>+15j</span>
        <span>+30j</span>
        <span>+45j</span>
      </div>
    </div>
  );
};

export default DateSlider;
