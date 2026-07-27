/**
 * FormField — Reusable Label + Input Wrapper
 * ===========================================
 *
 * Usage:
 *   <FormField label="Nom" htmlFor="user-nom" required>
 *     <input id="user-nom" ... />
 *   </FormField>
 */
import { labelStyle } from '../../utils/styles';

const FormField = ({ label, htmlFor, required, children, error }) => (
  <div>
    {label && (
      <label htmlFor={htmlFor} style={labelStyle}>
        {label}
        {required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}
      </label>
    )}
    {children}
    {error && (
      <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', margin: 0 }}>
        {error}
      </p>
    )}
  </div>
);

export default FormField;
