const SplashScreen = () => {
  return (
    <div 
      role="progressbar"
      aria-label="Chargement de l'application"
      aria-busy="true"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F7F0',
        zIndex: 9999,
      }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lineLoad {
          0% { width: 0%; left: 0; }
          50% { width: 100%; left: 0; }
          100% { width: 0%; left: 100%; }
        }
      `}</style>
      
      <div style={{ 
        textAlign: 'center',
        animation: 'fadeIn 0.8s ease-out forwards'
      }}>
        <img 
          src="/sicam-logo.png" 
          alt="SICAM AGRI" 
          style={{ 
            width: '180px', 
            height: 'auto', 
            marginBottom: '32px',
            display: 'block',
            margin: '0 auto 32px'
          }} 
        />
        
        <div style={{ 
          width: '140px', 
          height: '3px', 
          backgroundColor: 'rgba(0,128,48,0.1)',
          margin: '0 auto',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '3px'
        }}>
          <div style={{ 
            position: 'absolute',
            height: '100%',
            backgroundColor: '#008030',
            animation: 'lineLoad 2s infinite ease-in-out',
            borderRadius: '3px'
          }} />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
