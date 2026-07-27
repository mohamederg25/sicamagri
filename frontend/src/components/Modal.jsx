/**
 * Modal — Reusable Modal Component
 * ==================================
 * Simple overlay modal with backdrop click to close.
 */

import { useEffect, useRef } from 'react';

const Modal = ({ isOpen, onClose, title, children, width = '520px' }) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        backgroundColor: 'white', borderRadius: '16px',
        width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        padding: '28px',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '20px',
        }}>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#222222', margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              border: 'none', background: '#f3f4f6', color: '#222222',
              fontSize: '18px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
