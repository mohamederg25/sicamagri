/**
 * GerminationBadge — Displays germination rate with color-coded badge
 * ================================================================
 * Uses inline styles (consistent with the rest of the app) instead of Tailwind classes.
 *
 * Props:
 *   rate     — Germination rate (0-100) or null/undefined for "Not tested"
 *   isManual — Whether the rate was set manually (vs. from a formal test)
 */

const getRateColor = (rate) => {
  if (rate >= 70) return { bg: '#E8F5E9', color: '#008840', label: 'Élevé' };
  if (rate >= 40) return { bg: '#FFF8E1', color: '#8D6E00', label: 'Moyen' };
  return { bg: '#FFEBEE', color: '#B02020', label: 'Faible' };
};

const GerminationBadge = ({ rate, isManual }) => {
  if (rate === null || rate === undefined) {
    return (
      <span
        aria-label="Taux de germination non testé"
        style={{
          padding: '6px 12px',
          fontSize: '12px',
          fontWeight: 700,
          borderRadius: '9999px',
          backgroundColor: '#e2e8f0',
          color: '#475569',
          border: '1px solid #cbd5e1',
          display: 'inline-block',
        }}
      >
        Non testé
      </span>
    );
  }

  const colors = getRateColor(rate);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span
        aria-label={`Taux de germination : ${rate.toFixed(1)}%, ${colors.label}${isManual ? ', estimé' : ''}`}
        style={{
          padding: '6px 16px',
          fontSize: '12px',
          fontWeight: 700,
          borderRadius: '9999px',
          backgroundColor: colors.bg,
          color: colors.color,
          border: isManual ? '2px dashed #94a3b8' : 'none',
          display: 'inline-block',
        }}
      >
        {rate.toFixed(1)}%
      </span>
      {isManual && (
        <span
          aria-label="Taux estimé manuellement"
          style={{
            fontSize: '10px',
            color: '#64748b',
            fontWeight: 600,
            marginTop: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Estimé
        </span>
      )}
    </div>
  );
};

export default GerminationBadge;
