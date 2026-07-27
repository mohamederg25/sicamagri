/**
 * StockSemenceDetail — Stock de Semences Detail View
 * ====================================================
 *
 * Shows full details of a stock entry with:
 *   - Stock info card (quantities, dates, supplier)
 *   - Movement history timeline
 *   - Quick action: add movement
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import Modal from '../components/common/Modal';
import stockService from '../services/stockService';
import pepiniereService from '../services/pepiniereService';
import ExportButton from '../components/ExportButton';
import { Warehouse, Sprout, FileText, ArrowLeft, Calendar, User, Package, BarChart3, TestTube, FlaskConical, Lock } from 'lucide-react';

const STATUS_CONFIG = {
  disponible: { label: 'Disponible', bg: '#E8F5E9', color: '#008030', border: '#C8E6C9' },
  en_usage:   { label: 'En usage',   bg: '#E3F2FD', color: '#1565C0', border: '#90CAF9' },
  epuise:     { label: 'Épuisé',     bg: '#FFEBEE', color: '#B02020', border: '#FFCDD2' },
};

const MOVEMENT_TYPE_CONFIG = {
  sortie_pepiniere: { label: 'Sortie pépinière', bg: '#E8F5E9', color: '#008030', icon: Sprout },
  bon_passage:      { label: 'Bon de passage',   bg: '#FFF8E1', color: '#8D6E00', icon: FileText },
  test_germination: { label: 'Test germination', bg: '#f3e8ff', color: '#7c3aed', icon: FlaskConical },
};

const StockSemenceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, fetchAppData } = useAuth();

  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pepinieres, setPepinieres] = useState([]);

  // Movement modal
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementForm, setMovementForm] = useState({
    type: 'sortie_pepiniere',
    quantite: '',
    pepiniere: '',
    referenceBon: '',
    motif: '',
    dateMouvement: new Date().toISOString().split('T')[0],
  });
  const [movementError, setMovementError] = useState('');
  const [submittingMovement, setSubmittingMovement] = useState(false);

  // ── Germination state ──
  const [germinationModalOpen, setGerminationModalOpen] = useState(false);
  const [germinationType, setGerminationType] = useState('manual'); // 'manual' or 'test'
  const [manualTaux, setManualTaux] = useState('');
  const [testForm, setTestForm] = useState({ grainesTestees: '', grainesGermees: '', dateTest: new Date().toISOString().split('T')[0] });
  const [germinationError, setGerminationError] = useState('');
  const [submittingGermination, setSubmittingGermination] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [stockRes, pepRes] = await Promise.all([
          stockService.getById(id),
          pepiniereService.getActive(),
        ]);
        setStock(stockRes.data);
        setPepinieres(pepRes.data);
      } catch (error) {
        console.error(error);
        if (error?.response?.status === 404) {
          navigate('/stock');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const openMovementModal = () => {
    setMovementForm({
      type: 'sortie_pepiniere',
      quantite: '',
      pepiniere: '',
      referenceBon: '',
      motif: '',
      dateMouvement: new Date().toISOString().split('T')[0],
    });
    setMovementError('');
    setMovementModalOpen(true);
  };

  const closeMovementModal = () => {
    setMovementModalOpen(false);
  };

  const handleSubmitMovement = async () => {
    setMovementError('');

    const quantite = Number(movementForm.quantite);
    if (!quantite || quantite <= 0) {
      setMovementError('La quantité doit être supérieure à 0');
      return;
    }
    if (quantite > stock.quantiteRestante) {
      setMovementError(`Quantité insuffisante. Restant: ${stock.quantiteRestante}`);
      return;
    }
    if (movementForm.type === 'sortie_pepiniere' && !movementForm.pepiniere) {
      setMovementError('Veuillez sélectionner une pépinière de destination');
      return;
    }

    try {
      setSubmittingMovement(true);
      await stockService.createMovement(stock._id, movementForm);
      await fetchAppData();
      // Refresh stock data
      const stockRes = await stockService.getById(id);
      setStock(stockRes.data);
      closeMovementModal();
    } catch (error) {
      setMovementError(error?.response?.data?.message || 'Erreur lors de la création du mouvement');
    } finally {
      setSubmittingMovement(false);
    }
  };

  // ── Germination handlers ──
  const openGerminationModal = (type) => {
    setGerminationType(type);
    setManualTaux(stock.tauxManuel != null ? String(stock.tauxManuel) : '');
    setTestForm({ grainesTestees: '', grainesGermees: '', dateTest: new Date().toISOString().split('T')[0] });
    setGerminationError('');
    setGerminationModalOpen(true);
  };

  const handleSaveGermination = async () => {
    setGerminationError('');

    // ── Frontend date validation for germination test ──
    if (germinationType === 'test') {
      if (!testForm.dateTest) {
        setGerminationError('Veuillez sélectionner une date pour le test.');
        return;
      }
      if (stock.dateReception) {
        const recDate = new Date(stock.dateReception);
        recDate.setHours(0, 0, 0, 0);
        const testDate = new Date(testForm.dateTest);
        testDate.setHours(0, 0, 0, 0);
        if (testDate < recDate) {
          setGerminationError(
            `La date du test (${testDate.toLocaleDateString('fr-FR')}) ne peut pas être antérieure à la date de réception (${recDate.toLocaleDateString('fr-FR')}).`
          );
          return;
        }
      }
      // Validate test date is not in the future
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const testDate = new Date(testForm.dateTest);
      if (testDate > today) {
        setGerminationError('La date du test ne peut pas être dans le futur.');
        return;
      }
    }

    try {
      setSubmittingGermination(true);
      if (germinationType === 'manual') {
        const taux = manualTaux === '' ? null : Number(manualTaux);
        await stockService.setManualRate(stock._id, taux);
      } else {
        await stockService.createGerminationTest(stock._id, {
          grainesTestees: Number(testForm.grainesTestees),
          grainesGermees: Number(testForm.grainesGermees),
          dateTest: testForm.dateTest,
        });
      }
      // Refresh
      const stockRes = await stockService.getById(id);
      setStock(stockRes.data);
      setGerminationModalOpen(false);
    } catch (error) {
      setGerminationError(error?.response?.data?.message || 'Erreur lors de la mise à jour du taux de germination');
    } finally {
      setSubmittingGermination(false);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!confirm('Supprimer ce test de germination ?')) return;
    try {
      await stockService.deleteGerminationTest(testId);
      const stockRes = await stockService.getById(id);
      setStock(stockRes.data);
    } catch (error) {
      alert(error?.response?.data?.message || 'Erreur lors de la suppression du test');
    }
  };

  if (loading) return <Loading />;
  if (!stock) return <Loading />;

  // ── Compute derived values (safe: stock is guaranteed non-null here) ──
  const computeBestTaux = () => {
    if (stock.germinationTests && stock.germinationTests.length > 0) {
      const sorted = [...stock.germinationTests].sort((a, b) => new Date(b.dateTest) - new Date(a.dateTest));
      const latest = sorted[0];
      if (latest && latest.grainesTestees > 0) {
        return Math.round((latest.grainesGermees / latest.grainesTestees) * 100);
      }
    }
    if (stock.tauxManuel != null) return stock.tauxManuel;
    return null;
  };

  const tauxGermination = computeBestTaux();
  const hasFormalTest = stock.germinationTests && stock.germinationTests.length > 0;
  const latestTest = hasFormalTest
    ? [...stock.germinationTests].sort((a, b) => new Date(b.dateTest) - new Date(a.dateTest))[0]
    : null;

  const cfg = STATUS_CONFIG[stock.statut] || STATUS_CONFIG.disponible;
  const quantiteUtilisee = (stock.quantiteInitiale || 0) - (stock.quantiteRestante || 0);
  const utilisationPct = stock.quantiteInitiale > 0 ? Math.round((quantiteUtilisee / stock.quantiteInitiale) * 100) : 0;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* ═══ Back button ═══ */}
      <button
        onClick={() => navigate('/stock')}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', color: '#222222',
          fontSize: '14px', fontWeight: 500, background: 'none', border: 'none',
          cursor: 'pointer', marginBottom: '20px', padding: '0', fontFamily: 'inherit',
        }}
      >
        <ArrowLeft size={16} />
        Retour au stock
      </button>

      {/* ═══ Header Card ═══ */}
      <div style={{
        backgroundColor: 'white', borderRadius: '16px', border: '1px solid #C8E6C9',
        padding: '28px 32px', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{
                fontSize: '28px', fontWeight: 800, fontFamily: 'monospace',
                color: '#008030', backgroundColor: '#f0fdf4',
                padding: '8px 20px', borderRadius: '8px', letterSpacing: '1px',
              }}>
                {stock.code}
              </span>
              <span style={{
                padding: '6px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: 700,
                backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
              }}>
                {cfg.label}
              </span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937', margin: '8px 0 0' }}>
              {stock.variete?.nom || '—'}
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {stock.quantiteRestante > 0 && (user?.role === 'admin' || user?.role === 'employe') && (
              <button
                onClick={() => navigate(`/semis/new?stockId=${stock._id}`)}
                title="Sortie en pépinière (créer un semis)"
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#1565C0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '20px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0d47a1'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1565C0'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 1l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 23l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Quantities Grid ═══ */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px', marginBottom: '24px',
      }}>
        <div style={{
          background: 'white', borderRadius: '12px', padding: '20px',
          border: '1px solid #C8E6C9', textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Warehouse size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Initial
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#1f2937', marginTop: '4px' }}>
            {stock.quantiteInitiale?.toLocaleString()}
          </div>
        </div>
        <div style={{
          background: '#E8F5E9', borderRadius: '12px', padding: '20px',
          border: '1px solid #C8E6C9', textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#008030', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Sprout size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Restant
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#008030', marginTop: '4px' }}>
            {stock.quantiteRestante?.toLocaleString()}
          </div>
        </div>
        <div style={{
          background: '#fef3c7', borderRadius: '12px', padding: '20px',
          border: '1px solid #fde68a', textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <BarChart3 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Utilisé
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#92400e', marginTop: '4px' }}>
            {quantiteUtilisee.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>
            {utilisationPct}%
          </div>
        </div>
        <div style={{
          background: 'white', borderRadius: '12px', padding: '20px',
          border: '1px solid #C8E6C9', textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <User size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Créé par
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', marginTop: '4px' }}>
            {stock.createdBy?.nom || 'Système'}
          </div>
        </div>
      </div>

      {/* ═══ Germination Card ═══ */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9',
        padding: '20px 24px', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#222222', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TestTube size={18} color={tauxGermination != null ? '#008030' : '#9ca3af'} />
            Taux de germination
          </h3>
          {(user?.role === 'admin' || user?.role === 'employe') && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => openGerminationModal('manual')}
                style={{
                  padding: '8px 14px', backgroundColor: 'white', color: '#1565C0',
                  border: '1px solid #90CAF9', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E3F2FD'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
              >
                {stock.tauxManuel != null ? 'Modifier manuel' : 'Saisie manuelle'}
              </button>
              <button
                onClick={() => openGerminationModal('test')}
                style={{
                  padding: '8px 14px', backgroundColor: '#008030', color: 'white',
                  border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                + Test
              </button>
            </div>
          )}
        </div>

        {/* Germination rate display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: stock.germinationTests?.length > 0 ? '16px' : '0' }}>
          {/* Big rate */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            backgroundColor: tauxGermination >= 70 ? '#E8F5E9' : tauxGermination >= 40 ? '#FFF8E1' : '#FFEBEE',
            border: `3px solid ${tauxGermination >= 70 ? '#22c55e' : tauxGermination >= 40 ? '#f59e0b' : '#ef4444'}`,
          }}>
            <span style={{
              fontSize: '22px', fontWeight: 800,
              color: tauxGermination >= 70 ? '#008030' : tauxGermination >= 40 ? '#8D6E00' : '#B02020',
            }}>
              {tauxGermination != null ? `${tauxGermination}%` : '?'}
            </span>
          </div>
          <div>
            {tauxGermination != null ? (
              <>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>
                  {tauxGermination >= 70 ? 'Excellent' : tauxGermination >= 40 ? 'Moyen' : 'Faible'}
                </div>
                <div style={{ fontSize: '13px', color: '#111111', marginTop: '2px' }}>
                  {hasFormalTest
                    ? `Dernier test: ${new Date(latestTest.dateTest).toLocaleDateString('fr-FR')}`
                    : stock.tauxManuel != null
                      ? 'Taux saisi manuellement'
                      : ''
                  }
                </div>
              </>
            ) : (
              <div style={{ fontSize: '15px', color: '#111111' }}>
                Aucun taux de germination défini
              </div>
            )}
          </div>
        </div>

        {/* Test history */}
        {stock.germinationTests && stock.germinationTests.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#222222', marginBottom: '8px' }}>
              Tests réalisés ({stock.germinationTests.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[...stock.germinationTests].sort((a, b) => new Date(b.dateTest) - new Date(a.dateTest)).map((test) => (
                <div key={test._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', backgroundColor: '#f9fafb', borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FlaskConical size={16} color="#006625" />
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>
                        {test.grainesTestees} testées, {test.grainesGermees} germées
                      </span>
                      <span style={{
                        marginLeft: '8px', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700,
                        backgroundColor: test.tauxGermination >= 70 ? '#E8F5E9' : test.tauxGermination >= 40 ? '#FFF8E1' : '#FFEBEE',
                        color: test.tauxGermination >= 70 ? '#008030' : test.tauxGermination >= 40 ? '#8D6E00' : '#B02020',
                      }}>
                        {test.tauxGermination}%
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#111111' }}>
                      {new Date(test.dateTest).toLocaleDateString('fr-FR')}
                    </span>
                    {(user?.role === 'admin' || user?.role === 'employe') && (
                      <button
                        onClick={() => handleDeleteTest(test._id)}
                        style={{
                          background: 'none', border: 'none', color: '#B02020',
                          cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                          fontFamily: 'inherit', padding: '4px 8px', borderRadius: '4px',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        Suppr.
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Info Card ═══ */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9',
        padding: '20px 24px', marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#222222', margin: '0 0 14px' }}>
          Informations
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#222222', display: 'block' }}>Date de réception</span>
            <span style={{ fontSize: '15px', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <Calendar size={14} color="#111111" />
              {stock.dateReception ? new Date(stock.dateReception).toLocaleDateString('fr-FR') : '-'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#222222', display: 'block' }}>Créé par</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937', marginTop: '2px' }}>
              {stock.createdBy?.nom || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Utilisation Progress Bar ═══ */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9',
        padding: '20px 24px', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#222222', margin: 0 }}>
            Taux d'utilisation
          </h3>
          <span style={{
            fontSize: '20px', fontWeight: 800,
            color: utilisationPct >= 80 ? '#B02020' : utilisationPct >= 40 ? '#8D6E00' : '#008030',
          }}>
            {utilisationPct}%
          </span>
        </div>
        <div style={{ height: '12px', backgroundColor: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${utilisationPct}%`, borderRadius: '6px',
            backgroundColor: utilisationPct >= 80 ? '#B02020' : utilisationPct >= 40 ? '#f59e0b' : '#22c55e',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', color: '#111111' }}>
          <span>{quantiteUtilisee.toLocaleString()} utilisé{quantiteUtilisee > 1 ? 's' : ''}</span>
          <span>{stock.quantiteRestante?.toLocaleString()} restant{stock.quantiteRestante > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ═══ Movements Timeline ═══ */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9',
        padding: '20px 24px', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#222222', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={18} color="#1565C0" />
            Historique des mouvements
            <span style={{
              padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
              backgroundColor: '#E3F2FD', color: '#1565C0',
            }}>
              {stock.mouvements?.length || 0}
            </span>
          </h3>
          <ExportButton
            user={user}
            filename={`mouvements-${stock.code || 'stock'}`}
            columns={[
              { accessor: 'dateMouvement', header: 'Date' },
              { accessor: 'type', header: 'Type' },
              { accessor: 'quantite', header: 'Quantité' },
              { accessor: 'destination', header: 'Destination / Réf.' },
              { accessor: 'createdBy.nom', header: 'Par' },
            ]}
            data={stock.mouvements || []}
            mapRow={(m) => {
              const typeLabel = MOVEMENT_TYPE_CONFIG[m.type]?.label || m.type || '-';
              let dest = '-';
              if (m.type === 'sortie_pepiniere') dest = m.pepiniere?.nom || '—';
              else if (m.type === 'bon_passage') dest = m.referenceBon || m.motif || '-';
              else if (m.type === 'test_germination') dest = m.motif || '-';
              return [
                m.dateMouvement ? new Date(m.dateMouvement).toLocaleDateString('fr-FR') : '-',
                typeLabel,
                m.quantite?.toLocaleString('fr-FR') || '-',
                dest,
                m.createdBy?.nom || 'Système',
              ];
            }}
          />
        </div>

        {stock.mouvements && stock.mouvements.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stock.mouvements.map((m) => {
              const mCfg = MOVEMENT_TYPE_CONFIG[m.type] || MOVEMENT_TYPE_CONFIG.bon_passage;
              const Icon = mCfg.icon;
              return (
                <div key={m._id} style={{
                  display: 'flex', gap: '14px', padding: '14px 16px',
                  borderRadius: '10px', backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb', alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    backgroundColor: mCfg.bg, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, color: mCfg.color,
                  }}>
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{
                          padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                          backgroundColor: mCfg.bg, color: mCfg.color,
                        }}>
                          {mCfg.label}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#111111' }}>
                        {m.dateMouvement ? new Date(m.dateMouvement).toLocaleDateString('fr-FR') : '-'}
                      </span>
                    </div>
                    <div style={{ marginTop: '6px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>
                        {m.quantite?.toLocaleString()} graines
                      </span>
                      {m.type === 'sortie_pepiniere' && (
                        <span style={{ fontSize: '14px', color: '#111111' }}>
                          → {m.pepiniere?.nom || '-'}
                          {m.semisCree && (
                            <span style={{ color: '#008030', fontFamily: 'monospace', marginLeft: '6px' }}>
                              (Semis: {m.semisCree.code})
                            </span>
                          )}
                        </span>
                      )}
                      {m.type === 'bon_passage' && (
                        <span style={{ fontSize: '14px', color: '#111111' }}>
                          {m.referenceBon || m.motif || '-'}
                        </span>
                      )}
                      {m.type === 'test_germination' && (
                        <span style={{ fontSize: '14px', color: '#7c3aed' }}>
                          {m.motif}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#111111' }}>
                      Par: {m.createdBy?.nom || 'Système'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: '#222222' }}>
            <Package size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Aucun mouvement</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Ce stock n'a pas encore été utilisé. Cliquez sur "Nouvelle sortie" pour créer un mouvement.
            </p>
          </div>
        )}
      </div>

      {/* ═══ Germination Modal ═══ */}
      <Modal isOpen={germinationModalOpen} onClose={() => setGerminationModalOpen(false)} title="Taux de germination" maxWidth="480px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Type selection */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setGerminationType('manual')}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                border: germinationType === 'manual' ? '2px solid #1565C0' : '1px solid #d1d5db',
                backgroundColor: germinationType === 'manual' ? '#f0f9ff' : 'white',
                color: germinationType === 'manual' ? '#1565C0' : '#222222',
              }}
            >
              Saisie manuelle
            </button>
            <button
              onClick={() => setGerminationType('test')}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                border: germinationType === 'test' ? '2px solid #008030' : '1px solid #d1d5db',
                backgroundColor: germinationType === 'test' ? '#f0fdf4' : 'white',
                color: germinationType === 'test' ? '#008030' : '#222222',
              }}
            >
              <FlaskConical size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Test formel
            </button>
          </div>

          {germinationType === 'manual' ? (
            <>
              <p style={{ fontSize: '13px', color: '#222222', margin: 0 }}>
                Saisissez un taux de germination estimé (0-100%). Laissez vide pour effacer.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
                  Taux de germination (%)
                </label>
                <input
                  type="number" min="0" max="100" step="0.1"
                  value={manualTaux}
                  onChange={(e) => setManualTaux(e.target.value)}
                  placeholder="Ex: 85"
                  style={{
                    width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                    fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: '#222222', margin: 0 }}>
                Enregistrez un test de germination formel avec le nombre de graines testées et germées.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
                  Date du test
                </label>
                <input
                  type="date"
                  value={testForm.dateTest}
                  onChange={(e) => setTestForm((prev) => ({ ...prev, dateTest: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                    fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                    borderColor: stock.dateReception && testForm.dateTest && new Date(testForm.dateTest) < new Date(stock.dateReception)
                      ? '#ef4444'
                      : '#d1d5db',
                  }}
                />
                {stock.dateReception && (
                  <div style={{ fontSize: '12px', color: '#111111', marginTop: '4px' }}>
                    Date de réception : {new Date(stock.dateReception).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
                  Graines testées *
                </label>
                <input
                  type="number" min="1"
                  value={testForm.grainesTestees}
                  onChange={(e) => setTestForm((prev) => ({ ...prev, grainesTestees: e.target.value }))}
                  placeholder="Ex: 100"
                  style={{
                    width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                    fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
                  Graines germées *
                </label>
                <input
                  type="number" min="0"
                  value={testForm.grainesGermees}
                  onChange={(e) => setTestForm((prev) => ({ ...prev, grainesGermees: e.target.value }))}
                  placeholder="Ex: 85"
                  style={{
                    width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                    fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                />
              </div>
              {testForm.grainesTestees && testForm.grainesGermees && Number(testForm.grainesTestees) > 0 && (
                <div style={{
                  padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: '8px',
                  border: '1px solid #bbf7d0', fontSize: '14px',
                }}>
                  Taux calculé : <strong>{Math.round((Number(testForm.grainesGermees) / Number(testForm.grainesTestees)) * 100)}%</strong>
                </div>
              )}
            </>
          )}

          {germinationError && (
            <div style={{
              padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px', color: '#991b1b', fontSize: '14px',
            }}>
              {germinationError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={() => setGerminationModalOpen(false)}
              style={{
                padding: '12px 20px', backgroundColor: '#f3f4f6', color: '#111111',
                border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              Annuler
            </button>
            <button
              onClick={handleSaveGermination}
              disabled={submittingGermination}
              style={{
                padding: '12px 20px', backgroundColor: submittingGermination ? '#9ca3af' : '#008030', color: 'white',
                border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700,
                cursor: submittingGermination ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>
              {submittingGermination ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══ Movement Modal ═══ */}
      <Modal isOpen={movementModalOpen} onClose={closeMovementModal} title="Nouvelle sortie de stock" maxWidth="520px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '10px',
            border: '1px solid #bbf7d0',
          }}>
            <div style={{ fontSize: '13px', color: '#006625' }}>
              Stock: <strong>{stock.code}</strong> — {stock.variete?.nom || '—'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937', marginTop: '4px' }}>
              Disponible: {stock.quantiteRestante?.toLocaleString()} graines
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setMovementForm((prev) => ({ ...prev, type: 'sortie_pepiniere' }))}
              title={tauxGermination == null ? 'Taux de germination requis pour sortir en pépinière' : 'Sortir des graines vers une pépinière'}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                cursor: tauxGermination == null ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: tauxGermination == null ? 0.5 : 1,
                border: movementForm.type === 'sortie_pepiniere'
                  ? (tauxGermination == null ? '2px solid #d97706' : '2px solid #008030')
                  : (tauxGermination == null ? '1px solid #fde68a' : '1px solid #d1d5db'),
                backgroundColor: movementForm.type === 'sortie_pepiniere'
                  ? (tauxGermination == null ? '#fffbeb' : '#f0fdf4')
                  : (tauxGermination == null ? '#fefce8' : 'white'),
                color: movementForm.type === 'sortie_pepiniere'
                  ? (tauxGermination == null ? '#92400e' : '#008030')
                  : (tauxGermination == null ? '#92400e' : '#222222'),
                display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (tauxGermination != null) {
                  e.currentTarget.style.backgroundColor = '#dcfce7';
                }
              }}
              onMouseLeave={(e) => {
                if (tauxGermination != null) {
                  e.currentTarget.style.backgroundColor = '#f0fdf4';
                }
              }}
            >
              {tauxGermination == null ? <Lock size={16} /> : <Sprout size={18} />}
              Sortie pépinière
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const y = now.getFullYear();
                const m = String(now.getMonth() + 1).padStart(2, '0');
                const hint = `BP-${y}${m}-#### (généré automatiquement)`;
                setMovementForm((prev) => ({ ...prev, type: 'bon_passage', referenceBon: hint }));
              }}
              title={tauxGermination == null ? 'Taux de germination requis pour toute sortie de stock' : 'Document de passage sans création de semis'}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                cursor: tauxGermination == null ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: tauxGermination == null ? 0.5 : 1,
                border: movementForm.type === 'bon_passage'
                  ? (tauxGermination == null ? '2px solid #d97706' : '2px solid #8D6E00')
                  : (tauxGermination == null ? '1px solid #fde68a' : '1px solid #d1d5db'),
                backgroundColor: movementForm.type === 'bon_passage'
                  ? (tauxGermination == null ? '#fffbeb' : '#FFF8E1')
                  : (tauxGermination == null ? '#fefce8' : 'white'),
                color: movementForm.type === 'bon_passage'
                  ? (tauxGermination == null ? '#92400e' : '#8D6E00')
                  : (tauxGermination == null ? '#92400e' : '#222222'),
                display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (tauxGermination != null) {
                  e.currentTarget.style.backgroundColor = '#fef3c7';
                }
              }}
              onMouseLeave={(e) => {
                if (tauxGermination != null) {
                  e.currentTarget.style.backgroundColor = '#FFF8E1';
                }
              }}
            >
              {tauxGermination == null ? <Lock size={16} /> : <FileText size={18} />}
              Bon de passage
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
              Quantité *
            </label>
            <input
              type="number" value={movementForm.quantite}
              onChange={(e) => setMovementForm((prev) => ({ ...prev, quantite: e.target.value }))}
              min="1" max={stock.quantiteRestante}
              style={{
                width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
              }}
              placeholder={`Max: ${stock.quantiteRestante?.toLocaleString() || '0'}`}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
              Date de sortie
            </label>              <input type="date" value={movementForm.dateMouvement}
              onChange={(e) => setMovementForm((prev) => ({ ...prev, dateMouvement: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                borderColor: stock.dateReception && movementForm.dateMouvement && new Date(movementForm.dateMouvement) < new Date(stock.dateReception)
                  ? '#ef4444'
                  : '#d1d5db',
              }} />
          </div>

          {/* ── Germination warning (shown for any type when no rate) ── */}
          {tauxGermination == null && (
            <div style={{
              padding: '12px 16px', backgroundColor: '#fef3c7', border: '1px solid #fde68a',
              borderRadius: '10px', fontSize: '13px', color: '#92400e',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <strong>⚠ Aucun taux de germination défini</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                    Vous devez définir un taux de germination avant de pouvoir effectuer une sortie de stock.
                  </p>
                </div>
                <button
                  onClick={() => { setMovementModalOpen(false); openGerminationModal('manual'); }}
                  style={{
                    padding: '8px 14px', backgroundColor: '#92400e', color: 'white',
                    border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#78350f'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#92400e'; }}
                >
                  <TestTube size={14} />
                  Définir
                </button>
              </div>
            </div>
          )}

          {movementForm.type === 'sortie_pepiniere' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
                  Pépinière de destination *
                </label>
                <select value={movementForm.pepiniere}
                  onChange={(e) => setMovementForm((prev) => ({ ...prev, pepiniere: e.target.value }))}
                  style={{
                    width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                    fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', backgroundColor: 'white',
                  }}>
                  <option value="">Sélectionnez une pépinière</option>
                  {pepinieres.map((p) => (
                    <option key={p._id} value={p._id}>{p.nom}</option>
                  ))}
                </select>
                <p style={{ fontSize: '12px', color: '#111111', margin: '6px 0 0' }}>
                  Un semis sera automatiquement créé dans cette pépinière.
                </p>
              </div>
            </>
          )}

          {movementForm.type === 'bon_passage' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
                  Référence du bon
                  <span style={{
                    marginLeft: '8px', fontSize: '11px', fontWeight: 500, color: '#8D6E00',
                    backgroundColor: '#FFF8E1', padding: '2px 8px', borderRadius: '4px',
                    border: '1px solid #fde68a',
                  }}>
                    Auto-générée
                  </span>
                </label>
                <input type="text" value={movementForm.referenceBon}
                  readOnly
                  style={{
                    width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                    fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                    backgroundColor: '#f9fafb', color: '#6b7280', cursor: 'not-allowed',
                  }}
                  placeholder="Généré automatiquement" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
                  Motif
                </label>
                <textarea value={movementForm.motif}
                  onChange={(e) => setMovementForm((prev) => ({ ...prev, motif: e.target.value }))}
                  style={{
                    width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                    fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                    minHeight: '60px', resize: 'vertical',
                  }}
                  placeholder="Motif de la sortie..." />
              </div>
            </>
          )}

          {movementError && (
            <div style={{
              padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px', color: '#991b1b', fontSize: '14px',
            }}>
              {movementError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={closeMovementModal}
              style={{
                padding: '12px 20px', backgroundColor: '#f3f4f6', color: '#111111',
                border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              Annuler
            </button>
            <button
              onClick={handleSubmitMovement}
              disabled={submittingMovement}
              style={{
                padding: '12px 20px', backgroundColor: submittingMovement ? '#9ca3af' : '#008030', color: 'white',
                border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700,
                cursor: submittingMovement ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>
              {submittingMovement ? 'Création en cours...' : (movementForm.type === 'sortie_pepiniere' ? 'Sortir en pépinière' : 'Créer le bon de passage')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StockSemenceDetail;
