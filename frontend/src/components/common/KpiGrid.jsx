/**
 * KpiGrid — Reusable KPI card grid
 * 
 * Displays a grid of KPI cards with label, value, sub-text, and colored border.
 */
const KpiGrid = ({ items }) => (
  <div style={{
    padding: '16px 28px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '14px',
  }}>
    {items.map((kpi, i) => (
      <div key={i} style={{
        background: 'white', borderRadius: '10px', padding: '16px 18px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        borderLeft: `4px solid ${kpi.border}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '8px', right: '10px',
          fontSize: '1.6rem', opacity: 0.12,
        }}>{kpi.icon || ''}</div>
        <div style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: 600 }}>
          {kpi.label}
        </div>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#222' }}>
          {kpi.value}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '2px' }}>
          {kpi.sub}
        </div>
      </div>
    ))}
  </div>
);

export default KpiGrid;
