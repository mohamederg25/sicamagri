const Loading = ({ label = 'Chargement en cours...' }) => (
  <div
    role="status"
    aria-live="polite"
    aria-label={label}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      height: '100%',
      minHeight: '400px',
      backgroundColor: '#F0F7F0',
    }}
  >
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes loadingPulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }
    `}</style>

    {/* Green spinner */}
    <div
      aria-hidden="true"
      style={{
        width: '36px',
        height: '36px',
        border: '3px solid #C8E6C9',
        borderTopColor: '#008030',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />

    {/* Text with subtle pulse */}
    <p
      style={{
        fontSize: '14px',
        color: '#6B7280',
        fontWeight: 500,
        margin: 0,
        animation: 'loadingPulse 1.5s ease-in-out infinite',
      }}
    >
      {label}
    </p>
  </div>
);

export default Loading;
