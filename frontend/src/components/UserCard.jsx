/**
 * UserCard — Minimalist avatar button
 * ====================================
 *
 * A small circular avatar that opens a clean dropdown on click.
 * Dropdown opens upward when placed at the bottom of the sidebar.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { IconProfile } from './icons';
import useWebSocket from '../hooks/useWebSocket';
import NotificationBell from './NotificationBell';

/* ── Helpers ── */
const getInitials = (name) => {
  if (!name) return '?';
  return name.split(/\s+/).filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

const getRoleColor = (role) => {
  const c = { admin: '#D50010', ingenieur: '#008030', employe: '#3B82F6', visiteur: '#6B7280' };
  return c[role] || c.visiteur;
};

const UserCard = () => {
  const { user, logout, updateNavbarPosition, navbarPosition, classicMode, toggleClassicMode } = useAuth();
  const { newAnomalies, connected, clearNotifications } = useWebSocket();
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Detect if dropdown should open upward (not enough space below)
  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 380); // dropdown needs ~380px
    }
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', width: '100%' }}>
      {/* ═══ Avatar trigger ═══ */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Menu utilisateur"
        aria-expanded={open}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #008030, #00A844)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid rgba(255,255,255,0.9)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 800,
          color: '#fff',
          boxShadow: open
            ? '0 0 0 3px rgba(0,128,48,0.2), 0 2px 8px rgba(0,0,0,0.12)'
            : '0 2px 6px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease',
          flexShrink: 0,
        }}
      >
        {getInitials(user?.nom)}
      </button>

      {/* ═══ Dropdown ═══ */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setOpen(false)}
          />

          <div style={{
            position: 'absolute',
            ...(dropUp
              ? { bottom: 'calc(100% + 8px)', top: 'auto' }
              : { top: 'calc(100% + 8px)', bottom: 'auto' }
            ),
            left: 0,
            width: '240px',
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid #e5e7eb',
            padding: '6px',
            zIndex: 1001,
            animation: 'ucFadeIn 0.15s ease',
          }}>
            {/* Header */}
            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #008030, #00A844)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 800, color: '#fff', flexShrink: 0,
              }}>
                {getInitials(user?.nom)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#111', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.nom}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: getRoleColor(user?.role), textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {user?.role}
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: '#f3f4f6', margin: '0 10px' }} />

            {/* Profile */}
            <Link to="/profile" onClick={() => setOpen(false)} style={linkStyle}>
              <IconProfile size={16} /> Mon Profil
            </Link>

            {/* Notification bell */}
            <div style={{ padding: '4px 12px' }} onClick={(e) => e.stopPropagation()}>
              <NotificationBell newAnomalies={newAnomalies} connected={connected} onClear={clearNotifications} dropdownPosition="left" />
            </div>

            <div style={{ height: '1px', background: '#f3f4f6', margin: '0 10px' }} />

            {/* Classic mode toggle */}
            <button onClick={(e) => { e.stopPropagation(); toggleClassicMode(); }} style={itemStyle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                  <rect x="2" y="3" width="20" height="18" rx="1" /><line x1="2" y1="9" x2="22" y2="9" /><line x1="12" y1="9" x2="12" y2="21" />
                </svg>
                {classicMode ? 'Classique' : 'Moderne'}
              </span>
              <div style={{
                width: '32px', height: '18px', borderRadius: '9px',
                backgroundColor: classicMode ? '#008030' : '#e5e7eb',
                display: 'flex', alignItems: 'center',
                justifyContent: classicMode ? 'flex-end' : 'flex-start',
                padding: '2px', transition: 'all 0.2s ease',
              }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </button>

            {/* Layout toggle */}
            <div style={{ padding: '4px 8px', display: 'flex', gap: '4px' }}>
              <button onClick={(e) => { e.stopPropagation(); updateNavbarPosition('sidebar'); setOpen(false); }}
                style={{
                  flex: 1, padding: '6px', borderRadius: '8px', border: navbarPosition === 'sidebar' ? '1.5px solid #008030' : '1px solid #e5e7eb',
                  background: navbarPosition === 'sidebar' ? '#f0fdf4' : '#fff', color: navbarPosition === 'sidebar' ? '#008030' : '#6b7280',
                  cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                Côté
              </button>
              <button onClick={(e) => { e.stopPropagation(); updateNavbarPosition('top'); setOpen(false); }}
                style={{
                  flex: 1, padding: '6px', borderRadius: '8px', border: navbarPosition === 'top' ? '1.5px solid #008030' : '1px solid #e5e7eb',
                  background: navbarPosition === 'top' ? '#f0fdf4' : '#fff', color: navbarPosition === 'top' ? '#008030' : '#6b7280',
                  cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                Haut
              </button>
            </div>

            <div style={{ height: '1px', background: '#f3f4f6', margin: '0 10px' }} />

            {/* Sign out */}
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); logout(); }}
              style={{ ...itemStyle, color: '#DC2626', fontWeight: 600 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Déconnexion
            </button>
          </div>
        </>
      )}

      <style>{`@keyframes ucFadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

const linkStyle = {
  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px',
  textDecoration: 'none', color: '#374151', fontSize: '13px', fontWeight: 500, transition: 'background 0.15s',
};
const itemStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
  padding: '8px 12px', borderRadius: '8px', border: 'none', background: 'transparent',
  color: '#374151', cursor: 'pointer', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit',
  transition: 'background 0.15s',
};

export default UserCard;
