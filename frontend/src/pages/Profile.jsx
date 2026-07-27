import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import { ROLE_LABELS } from '../constants/status';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleNameEdit = () => {
    setNameInput(user?.nom || '');
    setIsEditingName(true);
  };

  const handleNameCancel = () => {
    setIsEditingName(false);
    setNameInput('');
  };

  const handleNameSaveClick = () => {
    if (!nameInput.trim()) {
      setError('Le nom ne peut pas être vide');
      return;
    }
    setError('');
    setIsConfirmOpen(true);
  };

  const handleNameSave = async () => {
    setIsConfirmOpen(false);
    setIsLoading(true);
    setMessage('');
    try {
      await authService.updateProfile({ nom: nameInput.trim() });
      await refreshUser();
      setIsEditingName(false);
      setMessage('Nom mis à jour avec succès');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour du nom');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await authService.changePassword({ currentPassword, newPassword });
      setMessage(data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#222222', margin: 0 }}>Mon Profil</h1>
        <p style={{ fontSize: '16px', color: '#222222', marginTop: '4px' }}>Informations personnelles et sécurité</p>
      </header>

      {/* User Info Card */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #C8E6C9',
        borderRadius: '16px',
        padding: '28px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: '#B02020',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '28px',
            fontWeight: 800,
            flexShrink: 0
          }}>
            {user?.nom?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1 }}>
            {isEditingName ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label htmlFor="edit-name" style={{
                  fontSize: '14px', fontWeight: 600, color: '#111111'
                }}>
                  Nom
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="edit-name"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                  />
                  <button
                    onClick={handleNameSaveClick}
                    disabled={isLoading}
                    style={{
                      padding: '10px 18px',
                      backgroundColor: '#008030',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: isLoading ? 0.6 : 1
                    }}
                  >
                    {isLoading ? '...' : 'Sauvegarder'}
                  </button>
                  <button
                    onClick={handleNameCancel}
                    disabled={isLoading}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: '#f3f4f6',
                      color: '#111111',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#222222', margin: 0 }}>{user?.nom}</h2>
                  <p style={{ fontSize: '15px', color: '#222222', margin: '4px 0 0 0' }}>{user?.email}</p>
                  <span style={{
                    display: 'inline-block',
                    marginTop: '8px',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: '#f3f4f6',
                    color: '#111111',
                    border: '1px solid #C8E6C9'
                  }}>
                    {ROLE_LABELS[user?.role] || user?.role}
                  </span>
                </div>
                <button
                  onClick={handleNameEdit}
                  aria-label="Modifier mon nom"
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#f3f4f6',
                    color: '#111111',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                    marginTop: '4px'
                  }}
                >
                   Modifier
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #C8E6C9',
        borderRadius: '16px',
        padding: '28px'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#222222', margin: 0, marginBottom: '24px' }}>
          Changer le mot de passe
        </h2>

        {message && (
          <div role="alert" aria-live="assertive" style={{
            padding: '12px 16px',
            backgroundColor: '#E8F5E9',
            border: '1px solid #C8E6C9',
            borderRadius: '8px',
            color: '#008030',
            fontSize: '14px',
            fontWeight: 500,
            marginBottom: '20px'
          }}>
            {message}
          </div>
        )}

        {error && (
          <div role="alert" aria-live="assertive" style={{
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '14px',
            fontWeight: 500,
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} aria-label="Changer le mot de passe" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label htmlFor="current-password" style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#111111',
              marginBottom: '8px'
            }}>
              Mot de passe actuel
            </label>
            <input
              id="current-password"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Entrez votre mot de passe actuel"
              style={inputStyle}
            />
          </div>

          <div style={{
            borderTop: '1px solid #f3f4f6',
            paddingTop: '20px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label htmlFor="new-password" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#111111',
                  marginBottom: '8px'
                }}>
                  Nouveau mot de passe
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="confirm-password" style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#111111',
                  marginBottom: '8px'
                }}>
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmez le mot de passe"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              style={{
                padding: '12px 28px',
                backgroundColor: '#008030',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#006625'; }}
              onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#008030'; }}
            >
              {isLoading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </button>
          </div>
        </form>
      </div>
      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-name-title" style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          zIndex: 50
        }} onClick={() => setIsConfirmOpen(false)}>
          <div style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '28px'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                backgroundColor: '#FEF3C7', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '20px' }}></span>
              </div>
              <h2 id="confirm-name-title" style={{ fontSize: '18px', fontWeight: 700, color: '#222222', margin: 0 }}>
                Confirmer le changement
              </h2>
            </div>

            <p style={{ fontSize: '14px', color: '#222222', marginBottom: '20px', lineHeight: '1.5' }}>
              Êtes-vous sûr de vouloir modifier votre nom ?
            </p>

            <div style={{
              backgroundColor: '#f9fafb',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#222222' }}>Nom actuel</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#111111' }}>{user?.nom}</span>
              </div>
              <div style={{ borderTop: '1px solid #C8E6C9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#222222' }}>Nouveau nom</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#B02020' }}>{nameInput.trim()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setIsConfirmOpen(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f3f4f6',
                  color: '#111111',
                  border: '1px solid #d1d5db',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleNameSave}
                style={{
                  flex: 2,
                  padding: '12px',
                  backgroundColor: '#008030',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid #d1d5db',
  borderRadius: '10px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit'
};

export default Profile;
