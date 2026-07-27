/**
 * Modal — Reusable Modal Dialog
 * ==============================
 *
 * Usage:
 *   <Modal isOpen={isOpen} onClose={handleClose} title="Modal Title">
 *     <form>...</form>
 *   </Modal>
 */
import { useEffect, useCallback } from 'react';
import { modalOverlayStyle, modalContentStyle } from '../../utils/styles';

const Modal = ({ isOpen, onClose, title, children, maxWidth = '480px' }) => {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={modalOverlayStyle}
      onClick={onClose}
    >
      <div
        style={{ ...modalContentStyle, maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}>
          <h2 id="modal-title" style={{ fontSize: '20px', fontWeight: 700, color: '#222222', margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{ fontSize: '20px', fontWeight: 500, color: '#222222', border: 'none', background: 'none', cursor: 'pointer' }}
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
