/**
 * AlertCard — Collapsible alert card component
 * 
 * Supports click-to-expand detail panel on each alert item.
 * Used by admin & ingenieur roles on the dashboard.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronDown } from 'lucide-react';

/* ── Severity color config ── */
export const SEVERITY_STYLES = {
  critical: {
    bg: '#fef2f2',
    border: '#fecaca',
    accent: '#B02020',
    label: '#991b1b',
    valueColor: '#991b1b',
    pillBg: '#fee2e2',
    badge: 'Critique',
  },
  warning: {
    bg: '#fffbeb',
    border: '#fde68a',
    accent: '#D97706',
    label: '#92400e',
    valueColor: '#92400e',
    pillBg: '#fef3c7',
    badge: 'Attention',
  },
  info: {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    accent: '#008030',
    label: '#006625',
    valueColor: '#006625',
    pillBg: '#dcfce7',
    badge: 'Info',
  },
};

const AlertCard = ({ icon, title, items, emptyMsg, onDismiss }) => {
  const [expandedIdx, setExpandedIdx] = useState(null);

  return (
    <div style={{
      background: 'white', borderRadius: '10px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '12px 18px',
        borderBottom: '1px solid #f0f0f0',
        fontSize: '0.85rem', fontWeight: 700, color: '#444',
      }}>
        <span>{icon}</span> {title}
      </div>
      {items.length === 0 ? (
        <div style={{ padding: '24px 18px', textAlign: 'center', color: '#bbb', fontSize: '0.82rem' }}>
          {emptyMsg}
        </div>
      ) : (
        items.map((item, idx) => {
          const sev = SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.info;
          return (
          <div key={idx}>
            {/* ── Alert row (clickable to expand) ── */}
            <div
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              style={{
                padding: '10px 18px',
                borderBottom: idx < items.length - 1 ? '1px solid #f5f5f5' : 'none',
                display: 'flex', alignItems: 'center', gap: '10px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'background-color 0.12s',
                backgroundColor: expandedIdx === idx ? sev.bg : 'transparent',
                borderLeft: expandedIdx === idx ? `3px solid ${sev.accent}` : '3px solid transparent',
              }}
              onMouseEnter={(e) => { if (expandedIdx !== idx) e.currentTarget.style.backgroundColor = '#f5f5f5'; }}
              onMouseLeave={(e) => { if (expandedIdx !== idx) e.currentTarget.style.backgroundColor = 'transparent'; }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedIdx(expandedIdx === idx ? null : idx); } }}
              aria-expanded={expandedIdx === idx}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#333' }}>{item.title}</div>
                <div style={{ color: '#888', fontSize: '0.78rem', marginTop: '1px' }}>{item.desc}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: '4px',
                  fontSize: '0.65rem', fontWeight: 700,
                  backgroundColor: sev.pillBg,
                  color: sev.accent,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}>
                  {sev.badge}
                </span>
                {item.action && (
                  <Link
                    to={item.action.to}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      padding: '4px 10px', borderRadius: '5px',
                      fontSize: '0.75rem', fontWeight: 600,
                      backgroundColor: '#f3f4f6', color: '#555',
                      textDecoration: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    {item.action.label}
                  </Link>
                )}
                {onDismiss && item.key && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(item.key); }}
                    title="Marquer comme lu"
                    style={{
                      padding: '2px 6px', border: 'none', background: 'none',
                      cursor: 'pointer', color: '#bbb', fontSize: '14px',
                      lineHeight: 1, borderRadius: '4px', transition: 'all 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#B02020'; e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#bbb'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <X size={14} />
                  </button>
                )}
                <span style={{
                  fontSize: '10px', color: '#bbb',
                  transition: 'transform 0.2s',
                  transform: expandedIdx === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                  display: 'inline-block',
                }}>
                  <ChevronDown size={12} />
                </span>
              </div>
            </div>

            {/* ── Expandable detail panel ── */}
            {expandedIdx === idx && item.detail && (
              <div style={{
                padding: '12px 18px 14px 18px',
                backgroundColor: sev.bg,
                borderLeft: `3px solid ${sev.accent}`,
                borderBottom: idx < items.length - 1 ? '1px solid #f5f5f5' : 'none',
                animation: 'expandDetail 0.2s ease-out',
                fontSize: '0.8rem', lineHeight: '1.5',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  marginBottom: '8px', paddingBottom: '6px',
                  borderBottom: `1px solid ${sev.border}`,
                }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: '4px',
                    fontSize: '0.68rem', fontWeight: 700,
                    backgroundColor: sev.pillBg, color: sev.accent,
                    textTransform: 'uppercase',
                  }}>
                    {sev.badge}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: sev.label, fontWeight: 500 }}>
                    Détails de l'alerte
                  </span>
                  {onDismiss && item.key && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDismiss(item.key); }}
                      style={{
                        marginLeft: 'auto', padding: '3px 10px',
                        border: `1px solid ${sev.border}`, background: 'white',
                        cursor: 'pointer', color: sev.accent,
                        fontSize: '0.72rem', fontWeight: 600,
                        borderRadius: '4px', fontFamily: 'inherit',
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = sev.pillBg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                    >
                      Marquer lu
                    </button>
                  )}
                </div>
                {item.detail.map((line, li) => (
                  <div key={li} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '3px 0',
                    borderBottom: li < item.detail.length - 1 ? `1px dashed ${sev.border}` : 'none',
                  }}>
                    <span style={{ color: '#222222', fontWeight: 500 }}>{line.label}</span>
                    <span style={{ color: sev.valueColor, fontWeight: 600, textAlign: 'right' }}>
                      {line.value}
                    </span>
                  </div>
                ))}
                {item.action && (
                  <div style={{ marginTop: '10px', textAlign: 'right' }}>
                    <Link
                      to={item.action.to}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: '6px 16px', borderRadius: '6px',
                        fontSize: '0.78rem', fontWeight: 600,
                        backgroundColor: sev.accent, color: 'white',
                        textDecoration: 'none', display: 'inline-block',
                      }}
                    >
                      {item.action.label}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })
      )}
    </div>
  );
};

export default AlertCard;
