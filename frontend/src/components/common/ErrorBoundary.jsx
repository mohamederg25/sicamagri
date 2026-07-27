/**
 * ErrorBoundary — Catches React Render Errors
 * =============================================
 *
 * Prevents the entire app from crashing when a component throws during render.
 * Logs the error and shows a fallback UI with a retry option.
 *
 * Usage:
 *   <ErrorBoundary fallback={<CustomFallback />}>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 *   // Per-route wrapping in App.jsx:
 *   <Route path="lots" element={<ErrorBoundary><Lots /></ErrorBoundary>} />
 */
import { Component } from 'react';
import { COLORS } from '../../constants/colors';

const defaultFallbackStyle = {
  padding: '40px',
  textAlign: 'center',
  maxWidth: '500px',
  margin: '40px auto',
  backgroundColor: 'white',
  borderRadius: '12px',
  boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={defaultFallbackStyle} role="alert">
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>[!]</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#222', marginBottom: '8px' }}>
            Une erreur est survenue
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            {this.state.error?.message || 'Cette section a rencontré un problème inattendu.'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '10px 24px',
              backgroundColor: COLORS.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
