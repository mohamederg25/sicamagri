import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, ChevronLeft, Plus, Users, Sprout, Phone, Mail, MapPin, X } from 'lucide-react';
import Loading from '../components/Loading';
import pepiniereService from '../services/pepiniereService';
import userService from '../services/userService';
import { PEPINIERE_STATUS } from '../constants/status';

/* ── Reusable style patterns (matching LotDetail, ProductionPlanning, etc.) ── */
const cardStyle = {
  backgroundColor: 'white',
  border: '1px solid #C8E6C9',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const labelStyle = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#222222',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '4px',
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid #C8E6C9',
  borderRadius: '10px',
  fontSize: '16px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const btnPrimary = {
  width: '100%',
  padding: '14px',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'opacity 0.15s',
  fontFamily: 'inherit',
};

const Field = ({ label, value, valueStyle }) => (
  <div>
    <div style={labelStyle}>{label}</div>
    <p style={{ fontSize: '16px', fontWeight: 600, color: '#222222', margin: '4px 0 0', ...(valueStyle || {}) }}>
      {value ?? '—'}
    </p>
  </div>
);

const PepiniereDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pepiniere, setPepiniere] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const pepRes = await pepiniereService.getAll();
      const currentPep = pepRes.data.find(p => p._id === id);
      setPepiniere(currentPep);

      if (user?.role === 'admin' || user?.role === 'employe') {
        const usersRes = await userService.getIngenieurs();
        setAllUsers(usersRes.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const assignUser = async (userId) => {
    try {
      await pepiniereService.assignUser(id, userId);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const removeUser = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir retirer ce membre de la pépinière ?')) return;
    try {
      await pepiniereService.removeUser(id, userId);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const filteredUsers = allUsers.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.nom && u.nom.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  if (loading) return <Loading />;
  if (!pepiniere) return (
    <div style={{ textAlign: 'center', padding: '48px' }}>
      <p style={{ fontSize: '16px', color: '#222222' }}>Pépinière non trouvée</p>
    </div>
  );

  const statusCfg = PEPINIERE_STATUS[pepiniere.statut] || { label: pepiniere.statut, bg: '#f3f4f6', color: '#222222', border: '#e5e7eb' };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* ── Back Button ── */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          color: '#222222', fontSize: '14px', fontWeight: 500,
          background: 'none', border: 'none', cursor: 'pointer',
          marginBottom: '20px', padding: '0',
          fontFamily: 'inherit',
        }}
      >
        <ChevronLeft size={22} />
        Retour
      </button>

      {/* ════════════════════════════════════════════
          HEADER CARD — Code, name, status, contact
         ════════════════════════════════════════════ */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', minWidth: 0 }}>
            {/* Icon */}
            <div style={{
              padding: '12px',
              background: 'linear-gradient(135deg, #D50010, #8A1A1A)',
              borderRadius: '14px',
              boxShadow: '0 4px 12px rgba(213,0,16,0.2)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sprout size={28} color="white" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {pepiniere.code && (
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    backgroundColor: '#E8F5E9',
                    color: '#008030',
                    fontFamily: 'monospace',
                    letterSpacing: '0.05em',
                  }}>
                    {pepiniere.code}
                  </span>
                )}
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#222222', margin: 0 }}>
                  {pepiniere.nom}
                </h1>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: statusCfg.bg,
                  color: statusCfg.color,
                  border: `1px solid ${statusCfg.border || 'transparent'}`,
                  whiteSpace: 'nowrap',
                }}>
                  {statusCfg.label}
                </span>
              </div>
              {/* Contact info row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color="#D50010" />
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#111111' }}>
                    {pepiniere.address || 'Non renseignée'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} color="#D50010" />
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#111111' }}>
                    {pepiniere.number || 'Non renseigné'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} color="#D50010" />
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#111111' }}>
                    {pepiniere.email || 'Non renseigné'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {(user?.role === 'admin' || user?.role === 'employe') && (
            <button
              onClick={() => { setIsAssignModalOpen(true); setSearchQuery(''); }}
              style={{
                padding: '12px 20px',
                backgroundColor: '#FFEBEE',
                color: '#D50010',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 700,
                border: '1px solid #FFCDD2',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
                fontFamily: 'inherit',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFCDD2'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFEBEE'}
            >
              <Users size={18} />
              Gérer l'équipe
            </button>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          CONTENT GRID — Map (2/3) + Team (1/3)
         ════════════════════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px',
        alignItems: 'start',
      }}>
        {/* ── Map Section ── */}
        <div style={{ ...cardStyle }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#222222', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} color="#D50010" />
            Localisation
          </h3>
          {pepiniere.address ? (
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <iframe
                width="100%"
                height="300"
                frameBorder="0"
                style={{ border: 0, display: 'block' }}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(pepiniere.address)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                allowFullScreen
                title="Carte de localisation"
              />
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              border: '2px dashed #d1d5db',
            }}>
              <p style={{ fontSize: '14px', color: '#111111', fontWeight: 500 }}>
                Aucune adresse définie
              </p>
            </div>
          )}
        </div>

        {/* ── Team Section ── */}
        <div style={{
          ...cardStyle,
          background: 'linear-gradient(135deg, #F0F7F0 0%, #FFEBEE 100%)',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#222222', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#D50010" />
            Équipe Assignée
          </h3>

          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#222222',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            paddingBottom: '8px',
            borderBottom: '1px solid #C8E6C9',
            marginBottom: '12px',
          }}>
            Ingénieur
          </div>

          {pepiniere.ingenieur ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #C8E6C9',
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#FFEBEE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 700,
                color: '#D50010',
                flexShrink: 0,
              }}>
                {(pepiniere.ingenieur.nom ? pepiniere.ingenieur.nom[0] : 'I').toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#222222', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pepiniere.ingenieur.nom || 'Ingénieur'}
                </p>
                <p style={{ fontSize: '12px', color: '#222222', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pepiniere.ingenieur.email || ''}
                </p>
              </div>
              {(user?.role === 'admin' || user?.role === 'employe') && (
                <button
                  onClick={() => removeUser(pepiniere.ingenieur._id)}
                  title="Retirer l'ingénieur"
                  style={{
                    padding: '8px',
                    borderRadius: '10px',
                    border: '1px solid #C8E6C9',
                    backgroundColor: 'white',
                    color: '#D50010',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FFEBEE'; e.currentTarget.style.borderColor = '#D50010'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#C8E6C9'; }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ) : (
            <div style={{
              padding: '24px 16px',
              backgroundColor: 'rgba(255,255,255,0.6)',
              borderRadius: '12px',
              border: '2px dashed #C8E6C9',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '14px', color: '#111111', fontStyle: 'italic', margin: 0 }}>
                Aucun ingénieur assigné
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          ASSIGN MODAL
         ════════════════════════════════════════════ */}
      {isAssignModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '24px',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            maxWidth: '440px',
            width: '100%',
            padding: '32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#222222', margin: '0 0 4px' }}>
              Gérer l'équipe
            </h2>
            <p style={{ fontSize: '14px', color: '#222222', margin: '0 0 20px' }}>
              Assignez ou retirez des membres
            </p>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#111111' }} />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  ...inputStyle,
                  paddingLeft: '40px',
                  paddingRight: searchQuery ? '40px' : '16px',
                }}
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#111111',
                    padding: '4px',
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* User list */}
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '24px',
              paddingRight: '4px',
            }}>
              {filteredUsers.map(u => {
                const isCurrentIngenieur = pepiniere.ingenieur && (pepiniere.ingenieur._id || pepiniere.ingenieur) === u._id;
                return (
                  <div key={u._id} style={{
                    padding: '12px',
                    borderRadius: '14px',
                    border: `1px solid ${isCurrentIngenieur ? '#C8E6C9' : '#e5e7eb'}`,
                    backgroundColor: isCurrentIngenieur ? '#F0F7F0' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background-color 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: isCurrentIngenieur ? '#E8F5E9' : '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: isCurrentIngenieur ? '#008030' : '#6b7280',
                        flexShrink: 0,
                      }}>
                        {u.nom ? u.nom[0].toUpperCase() : 'U'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#222222', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.nom}
                          {isCurrentIngenieur && (
                            <span style={{
                              marginLeft: '8px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#E8F5E9',
                              color: '#008030',
                            }}>Assigné</span>
                          )}
                        </p>
                        <p style={{ fontSize: '12px', color: '#222222', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.email}
                        </p>
                      </div>
                    </div>
                    {isCurrentIngenieur ? (
                      <button
                        onClick={() => removeUser(u._id)}
                        style={{
                          padding: '8px',
                          borderRadius: '10px',
                          border: '1px solid #C8E6C9',
                          backgroundColor: 'white',
                          color: '#D50010',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                          flexShrink: 0,
                        }}
                        title="Retirer l'ingénieur"
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FFEBEE'; e.currentTarget.style.borderColor = '#D50010'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#C8E6C9'; }}
                      >
                        <X size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => assignUser(u._id)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '10px',
                          border: '1px solid #e5e7eb',
                          backgroundColor: 'white',
                          color: '#222222',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 600,
                          transition: 'all 0.15s',
                          flexShrink: 0,
                          fontFamily: 'inherit',
                        }}
                        title="Assigner comme ingénieur"
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#008030'; e.currentTarget.style.borderColor = '#008030'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                      >
                        + Assigner
                      </button>
                    )}
                  </div>
                );
              })}
              {filteredUsers.length === 0 && (
                <p style={{ textAlign: 'center', color: '#111111', fontStyle: 'italic', padding: '20px 0', margin: 0 }}>
                  {searchQuery ? 'Aucun utilisateur trouvé.' : 'Aucun ingénieur disponible.'}
                </p>
              )}
            </div>

            <button
              onClick={() => setIsAssignModalOpen(false)}
              style={{ ...btnPrimary, backgroundColor: '#f3f4f6', color: '#111111' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PepiniereDetail;
