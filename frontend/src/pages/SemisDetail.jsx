import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import Modal from '../components/common/Modal';
import lotService from '../services/lotService';
import semisService from '../services/semisService';
import pepiniereService from '../services/pepiniereService';

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  border: '1px solid #d1d5db',
  borderRadius: '10px',
  fontSize: '16px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit'
};

import { daysBetween } from '../utils/dates';

const fmtShort = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const ProductionTimeline = ({ dates }) => {
  if (!dates) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(dates.debut);
  const endMax = new Date(dates.maturiteMax);
  const totalDays = daysBetween(start, endMax);
  if (totalDays <= 0) return null;

  const pct = (d) => Math.min(100, Math.max(0, (daysBetween(start, new Date(d)) / totalDays) * 100));
  const todayPct = daysBetween(start, today);
  const showToday = todayPct >= 0 && todayPct <= totalDays;

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#22c55e' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#111111' }}>Croissance</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#f59e0b' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#111111' }}>Fenêtre de maturité</span>
        </div>
        {showToday && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 2, height: 12, backgroundColor: '#ef4444' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#111111' }}>Aujourd'hui</span>
          </div>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#222222' }}>{fmtShort(dates.debut)}</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#222222' }}>{fmtShort(dates.maturiteMax)}</span>
        </div>
        <div style={{ position: 'relative', height: '36px', backgroundColor: '#f3f4f6', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: `${pct(dates.debut)}%`, width: `${pct(dates.finMin) - pct(dates.debut)}%`, height: '100%', backgroundColor: '#22c55e', borderRadius: '8px 0 0 8px', opacity: 0.85 }} />
          <div style={{ position: 'absolute', left: `${pct(dates.finMin)}%`, width: `${pct(dates.finMax) - pct(dates.finMin)}%`, height: '100%', backgroundColor: '#f59e0b', borderRadius: '0 8px 8px 0', opacity: 0.85 }} />
          {showToday && (
            <div style={{ position: 'absolute', left: `${pct(today.toISOString())}%`, top: '-4px', width: '2px', height: 'calc(100% + 8px)', backgroundColor: '#ef4444', borderRadius: '1px', zIndex: 2 }} />
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#008030' }}>Semis</span>
            <span style={{ fontSize: '10px', color: '#222222' }}>{fmtShort(dates.debut)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#d97706' }}>Fenêtre de maturité</span>
            <span style={{ fontSize: '10px', color: '#222222' }}>{fmtShort(dates.finMin)} – {fmtShort(dates.finMax)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import { STOCK_STATUS } from '../constants/status';

const SemisDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [semis, setSemis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});

  const [errorMessage, setErrorMessage] = useState('');

  // ── Transfer state ──
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [pepinieres, setPepinieres] = useState([]);
  const [transferForm, setTransferForm] = useState({ destinationPepiniere: '', quantite: '' });
  const [transferError, setTransferError] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  const fetchPepinieres = async () => {
    try {
      const { data } = await pepiniereService.getActive();
      setPepinieres(data || []);
    } catch (err) {
      console.error('Failed to load pepinieres:', err);
    }
  };

  const openTransferModal = () => {
    if (!semis) return;
    const disponible = (semis.quantite || 0) - (semis.quantiteUtilisee || 0);
    setTransferForm({
      destinationPepiniere: '',
      quantite: disponible > 0 ? String(disponible) : '',
    });
    setTransferError('');
    fetchPepinieres();
    setTransferModalOpen(true);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setTransferError('');
    const qty = Number(transferForm.quantite);
    if (!qty || qty <= 0) {
      setTransferError('La quantité doit être supérieure à 0');
      return;
    }
    if (!transferForm.destinationPepiniere) {
      setTransferError('Veuillez sélectionner une pépinière de destination');
      return;
    }
    try {
      setTransferLoading(true);
      await semisService.transfer(id, transferForm);
      setTransferModalOpen(false);
      fetchSemis();
    } catch (error) {
      setTransferError(error?.response?.data?.message || 'Erreur lors du transfert');
    } finally {
      setTransferLoading(false);
    }
  };

  const fetchSemis = async () => {
    try {
      setLoading(true);
      const { data } = await semisService.getById(id);
      setSemis(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemis();
  }, [id]);

  const openEditModal = () => {
    setEditForm({
      statut: semis.statut,
      quantite: semis.quantite
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await semisService.update(id, editForm);
      fetchSemis();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <Loading />;

  if (!semis) return <div style={{ textAlign: 'center', padding: '48px' }}><p style={{ fontSize: '16px', color: '#222222' }}>Semis non trouvé</p></div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#222222',
          fontSize: '14px',
          fontWeight: 500,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          marginBottom: '24px',
          padding: '0'
        }}
      >
        Retour
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Info card */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #C8E6C9',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Variété
                </span>
                <p style={{ fontSize: '18px', fontWeight: 600, color: '#222222', marginTop: '6px' }}>
                  {semis.variete?.nom || '-'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Type de sortie
                </span>
                <p style={{ fontSize: '18px', fontWeight: 600, color: '#222222', marginTop: '6px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontWeight: 700,
                    backgroundColor: semis.type === 'externe' ? '#FFFBEB' : '#E8F5E9',
                    color: semis.type === 'externe' ? '#D97706' : '#008030',
                    border: `1px solid ${semis.type === 'externe' ? '#fde68a' : '#C8E6C9'}`,
                  }}>
                    {semis.type === 'externe' ? 'Sortie externe' : 'Sortie pépinière'}
                  </span>
                </p>
              </div>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {semis.type === 'externe' ? 'Motif' : 'Pépinière'}
                </span>
                <p style={{ fontSize: '18px', fontWeight: 600, color: '#222222', marginTop: '6px' }}>
                  {semis.type === 'externe'
                    ? (semis.motif || '-')
                    : (semis.pepiniere?.nom || '-')
                  }
                </p>
              </div>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Créé par
                </span>
                <p style={{ fontSize: '17px', fontWeight: 500, color: '#111111', marginTop: '6px' }}>
                  {semis.createdBy?.nom || '-'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Quantité
                </span>
                <p style={{ fontSize: '17px', fontWeight: 600, color: '#1f2937', marginTop: '6px' }}>
                  {semis.quantite || 0}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Quantité utilisée
                </span>
                <p style={{ fontSize: '17px', fontWeight: 600, color: '#B02020', marginTop: '6px' }}>
                  {semis.quantiteUtilisee || 0}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Disponible
                </span>
                <p style={{ fontSize: '17px', fontWeight: 600, color: semis.disponible > 0 ? '#008030' : '#9ca3af', marginTop: '6px' }}>
                  {semis.disponible || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Stock Summary card */}
          {semis.stockSummary && (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #C8E6C9',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#222222', marginBottom: '24px' }}>
                Stock
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#222222' }}>Reçu</span>
                  <span style={{ fontSize: '24px', fontWeight: 800, color: '#1f2937' }}>{semis.stockSummary.recu}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#222222' }}>Utilisé</span>
                  <span style={{ fontSize: '24px', fontWeight: 800, color: '#B02020' }}>{semis.stockSummary.utilise}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#222222' }}>Disponible</span>
                  <span style={{ fontSize: '24px', fontWeight: 800, color: semis.stockSummary.disponible > 0 ? '#008030' : '#9ca3af' }}>{semis.stockSummary.disponible}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#222222' }}>Taux utilisation</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {semis.stockSummary.tauxUtilisation !== null ? (
                      <>
                        <div style={{ width: '80px', height: '10px', backgroundColor: '#C8E6C9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${Math.min(100, semis.stockSummary.tauxUtilisation)}%`,
                            height: '100%', 
                            backgroundColor: semis.stockSummary.tauxUtilisation >= 80 ? '#B02020' : semis.stockSummary.tauxUtilisation >= 50 ? '#f59e0b' : '#008030'
                          }} />
                        </div>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>{semis.stockSummary.tauxUtilisation}%</span>
                      </>
                    ) : (
                      <span style={{ fontSize: '16px', color: '#111111' }}>-</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#222222' }}>Statut</span>
                  <span style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '15px',
                    fontWeight: 700,
                    backgroundColor: (STOCK_STATUS[semis.stockSummary.statut] || STOCK_STATUS.disponible).bg,
                    color: (STOCK_STATUS[semis.stockSummary.statut] || STOCK_STATUS.disponible).color,
                    border: `1px solid ${(STOCK_STATUS[semis.stockSummary.statut] || STOCK_STATUS.disponible).border}`
                  }}>
                    {(STOCK_STATUS[semis.stockSummary.statut] || STOCK_STATUS.disponible).label}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {semis.type !== 'externe' && semis.disponible > 0 && (user?.role === 'admin' || user?.role === 'employe' || user?.role === 'ingenieur') && (
              <button
                onClick={openTransferModal}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#D97706',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#B45309'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#D97706'; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                Transférer vers une pépinière
              </button>
            )}
            {user?.role === 'admin' && (
              <button
                onClick={openEditModal}
                style={{
                  width: '100%',
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
                Modifier le semis
              </button>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Lots de production card */}
          {semis.lotsProduction && semis.lotsProduction.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #C8E6C9',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#222222', margin: 0 }}>
                  Lots de production
                </h2>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: '#dcfce7',
                  color: '#006625'
                }}>
                  {semis.lotsProduction.length} lot(s)
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {semis.lotsProduction.map(lot => (
                  <div key={lot._id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    border: '1px solid #f3f4f6',
                    borderRadius: '10px',
                    backgroundColor: '#f0fdf4'
                  }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#006625', fontFamily: 'monospace' }}>
                        {lot.code || '-'}
                      </span>
                      <span style={{ fontSize: '13px', color: '#222222', marginLeft: '12px' }}>
                        {lot.quantite} graines
                      </span>
                    </div>
                    <span style={{ fontSize: '13px', color: '#222222' }}>
                      {lot.dateEntree ? new Date(lot.dateEntree).toLocaleDateString('fr-FR') : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Production card */}
          {semis.production && (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #C8E6C9',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#222222', marginBottom: '24px' }}>
                Production de Plants
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Taux de germination
                  </span>
                  <div style={{ marginTop: '6px' }}>
                    {semis.production.tauxGermination != null ? (
                      <span style={{
                        fontSize: '28px', fontWeight: 800, fontFamily: 'monospace',
                        padding: '6px 16px', borderRadius: '8px', display: 'inline-block',
                        backgroundColor: semis.production.tauxGermination >= 70 ? '#E8F5E9' : semis.production.tauxGermination >= 40 ? '#FFF8E1' : '#FFEBEE',
                        color: semis.production.tauxGermination >= 70 ? '#008030' : semis.production.tauxGermination >= 40 ? '#8D6E00' : '#B02020',
                        border: `2px solid ${semis.production.tauxGermination >= 70 ? '#bbf7d0' : semis.production.tauxGermination >= 40 ? '#fde68a' : '#fecaca'}`,
                      }}>
                        {semis.production.tauxGermination}%
                      </span>
                    ) : (
                      <span style={{ fontSize: '16px', fontWeight: 500, color: '#9ca3af' }}>
                        Non disponible
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Plants estimés
                  </span>
                  <p style={{ fontSize: '28px', fontWeight: 800, color: semis.production.nombrePlantsEstimes != null ? '#008030' : '#9ca3af', marginTop: '6px' }}>
                    {semis.production.nombrePlantsEstimes != null ? semis.production.nombrePlantsEstimes.toLocaleString('fr-FR') : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Durée de production card */}
          {semis.production && (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #C8E6C9',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#222222', marginBottom: '24px' }}>
                Durée de Production
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Durée production
                  </span>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', marginTop: '6px' }}>
                    {semis.production.dureeProduction.min}–{semis.production.dureeProduction.max} jours
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Fenêtre maturité
                  </span>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', marginTop: '6px' }}>
                    {semis.production.fenetreMaturite.min}–{semis.production.fenetreMaturite.max} jours
                  </p>
                </div>
              </div>

              {semis.production.dates && (
                <ProductionTimeline dates={semis.production.dates} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Transfer Modal ═══ */}
      <Modal isOpen={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="Transférer vers une autre pépinière" maxWidth="520px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Source info */}
          <div style={{
            padding: '14px 16px', backgroundColor: '#f0fdf4', borderRadius: '10px',
            border: '1px solid #bbf7d0',
          }}>
            <div style={{ fontSize: '13px', color: '#006625', marginBottom: '4px' }}>
              Source: <strong>{semis.code}</strong> — {semis.variete?.nom || '—'}
            </div>
            <div style={{ fontSize: '13px', color: '#006625' }}>
              Pépinière actuelle: <strong>{semis.pepiniere?.nom || '—'}</strong>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937', marginTop: '4px' }}>
              Disponible: {semis.disponible} graines
            </div>
          </div>

          <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
                Pépinière de destination *
              </label>
              <select
                value={transferForm.destinationPepiniere}
                onChange={(e) => setTransferForm((prev) => ({ ...prev, destinationPepiniere: e.target.value }))}
                required
                style={{
                  width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                  fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                  backgroundColor: 'white',
                }}
              >
                <option value="">Sélectionnez une pépinière</option>
                {pepinieres
                  .filter((p) => p._id !== (semis.pepiniere?._id || semis.pepiniere))
                  .map((p) => (
                    <option key={p._id} value={p._id}>{p.nom}</option>
                  ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
                Quantité à transférer *
              </label>
              <input
                type="number"
                value={transferForm.quantite}
                onChange={(e) => setTransferForm((prev) => ({ ...prev, quantite: e.target.value }))}
                min="1"
                max={semis.disponible}
                required
                style={{
                  width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                  fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                }}
                placeholder={`Max: ${semis.disponible}`}
              />
            </div>

            {/* Warning */}
            <div style={{
              padding: '10px 14px', backgroundColor: '#fef3c7', border: '1px solid #fde68a',
              borderRadius: '8px', fontSize: '13px', color: '#92400e',
            }}>
              <strong>⚠ Attention</strong> — Cette action va réduire la quantité de ce semis et créer un nouveau semis dans la pépinière de destination. Cette opération est irréversible.
            </div>

            {transferError && (
              <div style={{
                padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '8px', color: '#991b1b', fontSize: '14px',
              }}>
                {transferError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" onClick={() => setTransferModalOpen(false)}
                style={{
                  padding: '12px 20px', backgroundColor: '#f3f4f6', color: '#111111',
                  border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                Annuler
              </button>
              <button type="submit"
                disabled={transferLoading}
                style={{
                  padding: '12px 20px',
                  backgroundColor: transferLoading ? '#9ca3af' : '#D97706',
                  color: 'white', border: 'none', borderRadius: '10px',
                  fontSize: '15px', fontWeight: 700,
                  cursor: transferLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                {transferLoading ? 'Transfert en cours...' : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="17 1 21 5 17 9" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                    Transférer {transferForm.quantite || '0'} graines
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="semis-edit-title" style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          zIndex: 50
        }} onClick={() => setIsEditModalOpen(false)}>
          <div style={{
            width: '100%',
            maxWidth: '560px',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '28px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 id="semis-edit-title" style={{ fontSize: '20px', fontWeight: 700, color: '#222222', margin: 0 }}>Modifier le semis</h2>
              <button onClick={() => setIsEditModalOpen(false)}
                aria-label="Fermer"
                style={{ fontSize: '20px', fontWeight: 500, color: '#222222', border: 'none', background: 'none', cursor: 'pointer' }}>
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit} aria-label="Modifier le semis" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="semis-edit-statut" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>Statut</label>
                <select id="semis-edit-statut" value={editForm.statut}
                  onChange={(e) => setEditForm({ ...editForm, statut: e.target.value })}
                  style={inputStyle}>
                  <option value="prevue">Prévue</option>
                  <option value="en_cours">En cours</option>
                  <option value="realisee">Réalisée</option>
                  <option value="annulee">Annulée</option>
                </select>
              </div>
              <div>
                <label htmlFor="semis-edit-qty" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>Quantité</label>
                <input id="semis-edit-qty" type="number" required
                  value={editForm.quantite}
                  onChange={(e) => setEditForm({ ...editForm, quantite: e.target.value })}
                  style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#f3f4f6', color: '#111111', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button type="submit"
                  style={{ flex: 2, padding: '12px', backgroundColor: '#008030', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemisDetail;
