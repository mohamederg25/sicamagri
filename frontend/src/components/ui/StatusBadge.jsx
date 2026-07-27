/**
 * StatusBadge — Reusable Status Badge Component
 * ==============================================
 *
 * Renders a colored badge for any entity status.
 *
 * Usage:
 *   <StatusBadge config={PRODUCTION_RECORD_STATUS[record.statut]} />
 *   <StatusBadge config={PHYTO_TYPE[intervention.typeIntervention]} />
 */
const StatusBadge = ({ config, label }) => {
  const { label: defaultLabel, bg, color, border } = config || {};
  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 700,
        backgroundColor: bg || '#f3f4f6',
        color: color || '#6b7280',
        border: border ? `1px solid ${border}` : '1px solid #C8E6C9',
        whiteSpace: 'nowrap',
      }}
    >
      {label || defaultLabel || '-'}
    </span>
  );
};

export default StatusBadge;
