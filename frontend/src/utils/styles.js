/**
 * Shared Inline Style Constants
 * ==============================
 *
 * Eliminates `inputStyle`, `labelStyle`, `thStyle` duplicates across pages.
 * Uses COLORS from constants/colors.js as the single source of truth.
 *
 * Usage:
 *   import { inputStyle, labelStyle, thStyle, tdStyle, btnStyle, modalOverlayStyle, modalContentStyle } from '../utils/styles';
 */
import { COLORS } from '../constants/colors';

export const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid #d1d5db',
  borderRadius: '10px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  color: COLORS.text,
};

export const labelStyle = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  color: COLORS.textMuted,
  marginBottom: '8px',
};

export const thStyle = {
  textAlign: 'center',
  padding: '16px 20px',
  fontSize: '12px',
  fontWeight: 700,
  color: COLORS.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #e5e7eb',
};

export const tdStyle = {
  padding: '16px 20px',
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'middle',
  color: COLORS.text,
};

export const btnStyle = {
  padding: '8px 12px',
  backgroundColor: 'white',
  color: COLORS.textMuted,
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  zIndex: 50,
};

export const modalContentStyle = {
  width: '100%',
  maxWidth: '480px',
  backgroundColor: 'white',
  borderRadius: '16px',
  padding: '28px',
  maxHeight: '90vh',
  overflowY: 'auto',
};

export const tableHeaderStyle = {
  padding: '14px 16px',
  fontSize: '12px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: COLORS.textMuted,
  backgroundColor: '#f9fafb',
  borderBottom: '2px solid #e5e7eb',
  textAlign: 'center',
  whiteSpace: 'nowrap',
};

export const tableCellStyle = {
  padding: '14px 16px',
  fontSize: '14px',
  color: COLORS.text,
  borderBottom: '1px solid #f3f4f6',
  verticalAlign: 'middle',
};
