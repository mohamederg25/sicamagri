import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        setError('Impossible de se connecter au serveur. Vérifiez que le backend est démarré (port 5000).');
      } else if (err.response?.status === 401) {
        setError('Email ou mot de passe invalide');
      } else {
        setError(err.response?.data?.message || err.message || 'Email ou mot de passe invalide');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main 
      aria-label="Page de connexion"
      style={{
        minHeight: '100vh',
        backgroundColor: '#F0F7F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'white',
        border: '1px solid #C8E6C9',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 4px 24px rgba(0,128,48,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Top accent line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '20%',
          right: '20%',
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #D50010, transparent)',
          borderRadius: '0 0 2px 2px',
        }} />

        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '180px',
            margin: '0 auto 20px'
          }}>
            <img 
              src="/logo2.jpeg" 
              alt="PEP — Gestion de pépinière"
              style={{ 
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: '12px',
              }}
            />
          </div>
          <p style={{ color: '#008030', fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em' }}>
            Gestion de pépinière
          </p>
        </div>

        {error && (
          <div 
            role="alert"
            aria-live="assertive"
            style={{
              padding: '12px 16px',
              backgroundColor: '#FFEBEE',
              border: '1px solid #FFCDD2',
              borderRadius: '8px',
              marginBottom: '24px',
              color: '#B02020',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} aria-label="Formulaire de connexion" noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label 
              htmlFor="login-email"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#111111',
                marginBottom: '8px',
              }}
            >
              Adresse email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={error ? 'login-error' : undefined}
              aria-invalid={error ? 'true' : undefined}
              style={{
                width: '100%',
                padding: '12px 14px',
                backgroundColor: 'white',
                border: '1px solid #C8E6C9',
                borderRadius: '10px',
                color: '#222222',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#008030';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,128,48,0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#C8E6C9';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label 
              htmlFor="login-password"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#111111',
                marginBottom: '8px',
              }}
            >
              Mot de passe
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? 'true' : undefined}
              style={{
                width: '100%',
                padding: '12px 14px',
                backgroundColor: 'white',
                border: '1px solid #C8E6C9',
                borderRadius: '10px',
                color: '#222222',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#008030';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,128,48,0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#C8E6C9';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            style={{
              padding: '14px',
              backgroundColor: '#008030',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: isLoading ? 0.6 : 1,
              letterSpacing: '0.02em',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.backgroundColor = '#006625';
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.currentTarget.style.backgroundColor = '#008030';
            }}
          >
            {isLoading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  );
};

export default Login;
