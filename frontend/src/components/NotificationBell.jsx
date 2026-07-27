/**
 * NotificationBell — Real-Time Anomaly Notification Component
 * ============================================================
 *
 * Displays a bell icon with a badge showing the number of new anomalies
 * detected in real-time via WebSocket. Clicking opens a dropdown with
 * the latest anomaly details.
 *
 * Usage:
 *   <NotificationBell
 *     newAnomalies={newAnomalies}
 *     connected={connected}
 *     onClear={clearNotifications}
 *     dropdownPosition="left"   // or "right" (default)
 *   />
 */

import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

const SEVERITY_LABELS = {
  critical: { label: 'Critique', color: '#B02020', bg: '#fef2f2', border: '#fecaca' },
  warning: { label: 'Attention', color: '#D97706', bg: '#fffbeb', border: '#fde68a' },
  info: { label: 'Info', color: '#008030', bg: '#f0fdf4', border: '#bbf7d0' },
};

const NotificationBell = ({ newAnomalies, connected, onClear, dropdownPosition = 'right' }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unreadCount = newAnomalies.length;

  // Group by severity for the summary
  const criticalCount = newAnomalies.filter((a) => a.severity === 'critical').length;
  const warningCount = newAnomalies.filter((a) => a.severity === 'warning').length;

  // Show last 10 anomalies
  const displayAnomalies = newAnomalies.slice(0, 10);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        title={unreadCount > 0 ? `${unreadCount} nouvelle(s) alerte(s)` : 'Aucune nouvelle alerte'}
        aria-label={`Notifications: ${unreadCount} non lues`}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '34px',
          height: '34px',
          borderRadius: '8px',
          border: connected ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(0,0,0,0.05)',
          backgroundColor: unreadCount > 0 ? '#fef2f2' : 'transparent',
          color: unreadCount > 0 ? '#B02020' : 'rgba(0,0,0,0.45)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = unreadCount > 0 ? '#fef2f2' : 'rgba(0,0,0,0.06)';
          e.currentTarget.style.color = unreadCount > 0 ? '#B02020' : 'rgba(0,0,0,0.7)';
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.backgroundColor = unreadCount > 0 ? '#fef2f2' : 'transparent';
            e.currentTarget.style.color = unreadCount > 0 ? '#B02020' : 'rgba(0,0,0,0.45)';
          }
        }}
      >
        {/* Bell icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Badge count */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '18px',
            height: '18px',
            borderRadius: '9px',
            backgroundColor: '#B02020',
            color: 'white',
            fontSize: '9px',
            fontWeight: 700,
            padding: '0 4px',
            lineHeight: 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            animation: unreadCount > 0 ? 'bellPulse 2s ease-in-out infinite' : 'none',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Connection indicator dot */}
        <div style={{
          position: 'absolute',
          bottom: '-2px',
          right: '-2px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: connected ? '#22c55e' : '#ef4444',
          border: '2px solid white',
        }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          [dropdownPosition === 'right' ? 'right' : 'left']: 0,
          width: '360px',
          maxHeight: '480px',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          zIndex: 1000,
          animation: 'slideDown 0.2s ease-out',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#333' }}>
              {connected ? '🔔 Notifications' : '🔴 Déconnecté'}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={() => { onClear(); setOpen(false); }}
                style={{
                  padding: '3px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '5px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#222222',
                  fontFamily: 'inherit',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Connection status */}
          {!connected && (
            <div style={{
              padding: '16px',
              textAlign: 'center',
              fontSize: '12px',
              color: '#999',
              backgroundColor: '#f9fafb',
            }}>
              Tentative de reconnexion...
            </div>
          )}

          {/* No notifications */}
          {connected && unreadCount === 0 && (
            <div style={{
              padding: '24px 16px',
              textAlign: 'center',
              fontSize: '12px',
              color: '#999',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px', display: 'block' }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Aucune nouvelle alerte
            </div>
          )}

          {/* Anomaly list */}
          {connected && unreadCount > 0 && (
            <>
              {/* Summary bar */}
              <div style={{
                display: 'flex',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#f9fafb',
                borderBottom: '1px solid #f0f0f0',
                fontSize: '11px',
                fontWeight: 600,
              }}>
                {criticalCount > 0 && (
                  <span style={{ color: '#B02020' }}>🔴 {criticalCount} critique{criticalCount > 1 ? 's' : ''}</span>
                )}
                {warningCount > 0 && (
                  <span style={{ color: '#D97706' }}>🟡 {warningCount} attention</span>
                )}
                <span style={{ color: '#222222', marginLeft: 'auto' }}>{unreadCount} total</span>
              </div>

              {/* Scrollable list */}
              <div style={{ overflowY: 'auto', maxHeight: '320px' }}>
                {displayAnomalies.map((a, i) => {
                  const sev = SEVERITY_LABELS[a.severity] || SEVERITY_LABELS.info;
                  const isStockEnded = a.type === 'stock:ended';
                  const isTransferred = a.type === 'semis:transferred';
                  const linkTo = isStockEnded ? `/stock/${a.stockId}` : `/semis/${a.semisId}`;
                  const titleCode = isStockEnded ? (a.stockCode || 'Stock') : (a.semisCode || 'Semis');
                  const titleLabel = isStockEnded ? 'Stock épuisé' : isTransferred ? 'Transfert reçu' : (a.type?.replace(/_/g, ' '));
                  const subtitle = isStockEnded ? '' : (a.variete?.nom || '?') + ' · ' + (a.pepiniere?.nom || '?');

                  return (
                    <Link
                      key={`${a.stockId || a.semisId}-${a.type}-${i}`}
                      to={linkTo}
                      onClick={() => setOpen(false)}
                      style={{
                        display: 'block',
                        padding: '10px 16px',
                        borderBottom: i < displayAnomalies.length - 1 ? '1px solid #f5f5f5' : 'none',
                        textDecoration: 'none',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        {/* Severity dot */}
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: sev.color,
                          flexShrink: 0,
                          marginTop: '4px',
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#333', marginBottom: '2px' }}>
                            {titleCode} — {titleLabel}
                          </div>
                          <div style={{ fontSize: '11px', color: '#222222', lineHeight: '1.3' }}>
                            {a.message}
                          </div>
                          {subtitle && (
                            <div style={{ fontSize: '10px', color: '#111111', marginTop: '3px' }}>
                              {subtitle}
                            </div>
                          )}
                        </div>
                        {/* Severity badge */}
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '3px',
                          fontSize: '9px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          backgroundColor: sev.bg,
                          color: sev.color,
                          flexShrink: 0,
                        }}>
                          {sev.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}

                {newAnomalies.length > 10 && (
                  <div style={{ padding: '10px 16px', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
                    <Link
                      to="/supervision"
                      onClick={() => setOpen(false)}
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#008030',
                        textDecoration: 'none',
                      }}
                    >
                      Voir toutes les anomalies ({newAnomalies.length}) →
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Footer link to supervision */}
          <Link
            to="/supervision"
            onClick={() => setOpen(false)}
            style={{
              display: 'block',
              padding: '10px 16px',
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 600,
              color: '#008030',
              textDecoration: 'none',
              borderTop: '1px solid #f0f0f0',
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Supervision complète →
          </Link>
        </div>
      )}

      {/* Keyframes for pulse animation */}
      <style>{`
        @keyframes bellPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
