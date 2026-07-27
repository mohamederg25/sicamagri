/**
 * ProgressBar — Reusable Progress Bar Component
 * ==============================================
 *
 * Renders a colored progress bar with optional label.
 *
 * Usage:
 *   <ProgressBar value={75} />                    // Default green
 *   <ProgressBar value={85} colors={pCol} />      // Custom colors
 *   <ProgressBar value={50} showLabel />           // With percentage text
 */

/* ── Default color scheme based on value ── */
const defaultColors = (value) => {
  if (value >= 100) return { bg: '#bbf7d0', fill: '#008030' };
  if (value >= 75)  return { bg: '#bbf7d0', fill: '#22c55e' };
  if (value >= 25)  return { bg: '#fef3c7', fill: '#d97706' };
  return { bg: '#C8E6C9', fill: '#6b7280' };
};

const ProgressBar = ({ value = 0, colors, showLabel, height = '8px', width }) => {
  const resolved = colors || defaultColors(value);
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: width || '100%',
    }}>
      <div style={{
        flex: 1,
        height,
        backgroundColor: resolved.bg,
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          backgroundColor: resolved.fill,
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        }} />
      </div>
      {showLabel && (
        <span style={{ fontSize: '11px', fontWeight: 700, color: resolved.fill, minWidth: '30px' }}>
          {pct}%
        </span>
      )}
    </div>
  );
};

export default ProgressBar;
