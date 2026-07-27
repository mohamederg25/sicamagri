/**
 * Layout — Main Application Shell
 * ================================
 *
 * Structure:
 *                                              
 *     Sidebar    <main> → <Outlet /> (page)   
 *                                              
 *     240px       flex: 1 (remaining width)    
 *
 * Features:
 *   - Focus management: main content receives focus on route change
 *   - aria-live region announces page changes to screen readers
 *   - Suspense boundary wraps <Outlet /> so lazy-loaded pages don't
 *     unmount the sidebar during chunk loading
 *   - <Outlet /> renders the matched child route from App.jsx
 *
 * The sidebar is always visible when authenticated.
 * All page content renders inside <main>.
 */

import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';

const Layout = () => {
  const { navbarPosition } = useAuth();
  const location = useLocation();
  const mainRef = useRef(null);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateDate = () => {
      setCurrentDate(new Date().toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      }));
    };
    updateDate();
    const timer = setInterval(updateDate, 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dir = 'ltr';
    document.body.classList.remove('rtl');
  }, []);

  // Focus main content on route change — helps keyboard & screen reader users
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.focus();
    }
  }, [location.pathname]);

  const isTop = navbarPosition === 'top';

  return (
    <div style={{
      display: 'flex',
      flexDirection: isTop ? 'column' : 'row',
      height: '100vh',
      backgroundColor: '#F0F7F0',
      overflow: 'hidden',
    }}    >
      {isTop ? <TopNavbar /> : <Sidebar />}
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        style={{ flex: 1, overflowY: 'auto', padding: '32px', outline: 'none' }}
        aria-label="Contenu principal"
        role="main"
      >
        {/* Screen reader announcement on page change */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only">
          Page chargée : {location.pathname === '/dashboard' ? 'Dashboard' : document.title || ''}
        </div>
        {/* Date displayed on all pages */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginBottom: '16px',
          fontSize: '13px',
          color: '#222222',
          fontWeight: 500,
          gap: '6px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {currentDate}
        </div>
        {/* Suspense boundary around page content only — sidebar stays visible */}
        <Suspense fallback={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            color: '#6b7280',
            fontSize: '14px',
            gap: '10px',
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #e5e7eb',
              borderTopColor: '#008030',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }} />
            Chargement…
          </div>
        }>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};

export default Layout;
