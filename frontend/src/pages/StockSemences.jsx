/**
 * StockSemences — Stock de Semences (Seed Warehouse)
 * ====================================================
 *
 * Main page for the SICAM seed warehouse inventory.
 * Accessible by admin and employe roles.
 *
 * Features:
 *   - Stats dashboard (total stock, utilisation, yield)
 *   - List of all stock entries with filters
 *   - Group by Fournisseur or Variété
 *   - Quick actions: create movement (sortie or bon de passage)
 *   - History of all movements
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import ExportButton from '../components/ExportButton';
import Modal from '../components/common/Modal';
import stockService from '../services/stockService';
import fournisseurService from '../services/fournisseurService';
import pepiniereService from '../services/pepiniereService';
import useSort from '../hooks/useSort';
import { Search, Package, Sprout, Warehouse, ClipboardList, ArrowRight, FileText, TestTube, ChevronDown, ChevronRight, Users, Tag } from 'lucide-react';

const STATUS_CONFIG = {
  disponible: { label: 'Disponible', bg: '#E8F5E9', color: '#008030', border: '#C8E6C9' },
  en_usage:   { label: 'En usage',   bg: '#E3F2FD', color: '#1565C0', border: '#90CAF9' },
  epuise:     { label: 'Épuisé',     bg: '#FFEBEE', color: '#B02020', border: '#FFCDD2' },
};  const MOVEMENT_TYPE_CONFIG = {
    sortie_pepiniere: { label: 'Sortie pépinière', bg: '#E8F5E9', color: '#008030' },
    bon_passage:      { label: 'Bon de passage',   bg: '#FFF8E1', color: '#8D6E00' },
    test_germination: { label: 'Test germination', bg: '#f3e8ff', color: '#7c3aed' },
    entree_stock:     { label: 'Entrée stock',      bg: '#E8F5E9', color: '#008030' },
  };

const StockSemences = () => {
  const [stockList, setStockList] = useState([]);
  const [stats, setStats] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [varFilter, setVarFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fournisseurFilter, setFournisseurFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('none');
  const [pepinieres, setPepinieres] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [activeTab, setActiveTab] = useState('stock');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [aggregateView, setAggregateView] = useState(false);
  const [aggregateSearch, setAggregateSearch] = useState('');

  // Reset collapsed groups when group-by mode changes
  useEffect(() => {
    setCollapsedGroups({});
  }, [groupBy]);

  // Movement modal
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
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

  // ── Quick germination modal (from list) ──
  const [germinationModalOpen, setGerminationModalOpen] = useState(false);
  const [selectedStockForGerm, setSelectedStockForGerm] = useState(null);
  const [quickTauxManuel, setQuickTauxManuel] = useState('');
  const [germinationError, setGerminationError] = useState('');
  const [submittingGermination, setSubmittingGermination] = useState(false);

  const { user, fetchAppData, classicMode } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stockRes, statsRes, movementsRes, pepRes, fourRes] = await Promise.all([
        stockService.getAll(),
        stockService.getStats(),
        stockService.getAllMovements(),
        pepiniereService.getActive(),
        fournisseurService.getAll(),
      ]);
      setStockList(stockRes.data);
      setStats(statsRes.data);
      setMovements(movementsRes.data);
      setPepinieres(pepRes.data);
      setFournisseurs(fourRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Derived filter options ──
  const varietes = useMemo(
    () => [...new Map(stockList.map((s) => [s.variete?._id, { _id: s.variete?._id, nom: s.variete?.nom }])).values()].filter((v) => v._id),
    [stockList]
  );

  const filteredStock = stockList.filter((s) => {
    const varMatch = varFilter === 'all' || (s.variete?._id || s.variete) === varFilter;
    const statusMatch = statusFilter === 'all' || s.statut === statusFilter;
    const fourMatch = fournisseurFilter === 'all' || (s.fournisseur?._id || s.fournisseur) === fournisseurFilter;
    if (!varMatch || !statusMatch || !fourMatch) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (s.variete?.nom || '').toLowerCase().includes(q) ||
      (s.code || '').toLowerCase().includes(q) ||
      (s.fournisseur?.nom || '').toLowerCase().includes(q)
    );
  });

  const { sortedData, handleSort, SortIcon } = useSort(filteredStock, { defaultField: 'code' });

  // ── Grouped data ──
  const groupedData = useMemo(() => {
    if (groupBy === 'none') return null;

    const groups = {};
    sortedData.forEach((stock) => {
      let key, label;
      if (groupBy === 'fournisseur') {
        key = stock.fournisseur?._id || 'none';
        label = stock.fournisseur?.nom || 'Sans fournisseur';
      } else if (groupBy === 'variete') {
        key = stock.variete?._id || 'none';
        label = stock.variete?.nom || 'Sans variété';
      }
      if (!groups[key]) groups[key] = { label, key, items: [], totalInitial: 0, totalRestant: 0, germinationRates: [], statuses: { disponible: 0, en_usage: 0, epuise: 0 } };
      groups[key].items.push(stock);
      groups[key].totalInitial += stock.quantiteInitiale || 0;
      groups[key].totalRestant += stock.quantiteRestante || 0;
      // Collect germination rates
      const taux = stock.tauxGermination != null ? stock.tauxGermination : stock.tauxManuel;
      if (taux != null) groups[key].germinationRates.push(taux);
      // Track statuses
      const st = stock.statut || 'disponible';
      groups[key].statuses[st] = (groups[key].statuses[st] || 0) + 1;
    });

    return Object.entries(groups).map(([key, group]) => {
      const utilisation = group.totalInitial > 0 ? Math.round(((group.totalInitial - group.totalRestant) / group.totalInitial) * 100) : 0;
      const avgGermination = group.germinationRates.length > 0
        ? Math.round(group.germinationRates.reduce((a, b) => a + b, 0) / group.germinationRates.length)
        : null;
      // Determine dominant status
      let dominantStatus = 'disponible';
      if (group.totalRestant <= 0 && group.totalInitial > 0) dominantStatus = 'epuise';
      else if (utilisation > 0) dominantStatus = 'en_usage';

      return {
        key,
        label: group.label,
        items: group.items,
        totalInitial: group.totalInitial,
        totalRestant: group.totalRestant,
        entryCount: group.items.length,
        utilisation,
        avgGermination,
        dominantStatus,
      };
    });
  }, [sortedData, groupBy]);

  // ── Filtered aggregated data (when in aggregate view) ──
  const filteredGroupedData = useMemo(() => {
    if (!groupedData) return null;
    if (!aggregateSearch.trim()) return groupedData;
    const q = aggregateSearch.toLowerCase();
    return groupedData.filter((g) => g.label.toLowerCase().includes(q));
  }, [groupedData, aggregateSearch]);
  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Open movement modal with stock pre-filled ──
  const openMovementModal = (stock) => {
    setSelectedStock(stock);
    setMovementForm({
      type: 'sortie_pepiniere',
      quantite: stock.quantiteRestante?.toString() || '',
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
    setSelectedStock(null);
  };

  /**
   * Generate a temporary reference hint for bon_passage on the client side.
   * The definitive reference is generated server-side.
   */
  const generateReferenceHint = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `BP-${y}${m}-#### (généré automatiquement)`;
  };

  const handleMovementChange = (field, value) => {
    // When switching to bon_passage, auto-fill the reference
    if (field === 'type' && value === 'bon_passage') {
      setMovementForm((prev) => ({
        ...prev,
        type: value,
        referenceBon: generateReferenceHint(),
      }));
    } else if (field === 'type' && value === 'sortie_pepiniere') {
      setMovementForm((prev) => ({
        ...prev,
        type: value,
        referenceBon: '',
        pepiniere: '',
      }));
    } else {
      setMovementForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmitMovement = async () => {
    if (!selectedStock) return;
    setMovementError('');

    const quantite = Number(movementForm.quantite);
    if (!quantite || quantite <= 0) {
      setMovementError('La quantité doit être supérieure à 0');
      return;
    }
    if (quantite > selectedStock.quantiteRestante) {
      setMovementError(`Quantité insuffisante. Restant: ${selectedStock.quantiteRestante}`);
      return;
    }
    if (movementForm.type === 'sortie_pepiniere' && !movementForm.pepiniere) {
      setMovementError('Veuillez sélectionner une pépinière de destination');
      return;
    }

    try {
      setSubmittingMovement(true);
      await stockService.createMovement(selectedStock._id, movementForm);
      await fetchData();
      await fetchAppData();
      closeMovementModal();
    } catch (error) {
      setMovementError(error?.response?.data?.message || 'Erreur lors de la création du mouvement');
    } finally {
      setSubmittingMovement(false);
    }
  };

  // ── Quick germination handlers ──
  const openGerminationModal = (stock) => {
    setSelectedStockForGerm(stock);
    setQuickTauxManuel('');
    setGerminationError('');
    setGerminationModalOpen(true);
  };

  const closeGerminationModal = () => {
    setGerminationModalOpen(false);
    setSelectedStockForGerm(null);
    setQuickTauxManuel('');
    setGerminationError('');
  };

  const handleSaveGermination = async () => {
    if (!selectedStockForGerm) return;
    setGerminationError('');

    const taux = quickTauxManuel === '' ? null : Number(quickTauxManuel);
    if (taux !== null && (isNaN(taux) || taux < 0 || taux > 100)) {
      setGerminationError('Le taux de germination doit être entre 0 et 100');
      return;
    }

    try {
      setSubmittingGermination(true);
      await stockService.setManualRate(selectedStockForGerm._id, taux);
      await fetchData();
      await fetchAppData();
      closeGerminationModal();
    } catch (error) {
      setGerminationError(error?.response?.data?.message || 'Erreur lors de la mise à jour du taux de germination');
    } finally {
      setSubmittingGermination(false);
    }
  };

  if (loading) return <Loading />;

  const selectStyle = {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    background: 'white',
    color: '#111111',
  };

  // ── Stock row component (reused in flat and grouped views) ──
  const renderStockRow = (s) => {
    const cfg = STATUS_CONFIG[s.statut] || STATUS_CONFIG.disponible;
    const quantiteUtilisee = (s.quantiteInitiale || 0) - (s.quantiteRestante || 0);
    const utilisationPct = s.quantiteInitiale > 0 ? Math.round((quantiteUtilisee / s.quantiteInitiale) * 100) : 0;

    // ── Low stock indicator ──
    const isExhausted = s.quantiteRestante <= 0 && s.quantiteInitiale > 0;
    const isLow = utilisationPct >= 80 && !isExhausted;
    const rowBorderColor = isExhausted ? '#B02020' : isLow ? '#d97706' : 'transparent';

    return (
      <tr
        key={s._id}
        style={{
          borderBottom: '1px solid #f3f4f6',
          borderLeft: `4px solid ${rowBorderColor}`,
          transition: 'all 0.15s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
        onClick={() => navigate(`/stock/${s._id}`)}
      >
        <td style={{ padding: '18px 20px', textAlign: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: '#008030', backgroundColor: '#f0fdf4', padding: '6px 14px', borderRadius: '6px', letterSpacing: '0.8px' }}>
            {s.code || '-'}
          </span>
        </td>
        <td style={{ padding: '18px 20px' }}>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
            {s.variete?.nom || '-'}
          </span>
        </td>
        <td style={{ padding: '18px 20px', textAlign: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>
            {s.fournisseur?.nom || '—'}
          </span>
        </td>
        <td style={{ padding: '18px 20px', textAlign: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>
            {s.quantiteInitiale?.toLocaleString() || '-'}
          </span>
        </td>
        <td style={{ padding: '18px 20px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: s.quantiteRestante > 0 ? '#008030' : '#9ca3af' }}>
              {s.quantiteRestante?.toLocaleString() || '0'}
            </span>
            {isExhausted && (
              <span style={{
                padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                backgroundColor: '#fef2f2', color: '#B02020',
                border: '1px solid #fecaca',
              }}>
                ÉPUISÉ
              </span>
            )}
            {isLow && (
              <span style={{
                padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                backgroundColor: '#fffbeb', color: '#92400e',
                border: '1px solid #fde68a',
              }}>
                FAIBLE
              </span>
            )}
          </div>
        </td>
        <td style={{ padding: '18px 20px', textAlign: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
          }}>
            <div style={{
              width: '60px', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden',
            }}>
              <div style={{
                width: `${utilisationPct}%`, height: '100%',
                backgroundColor: utilisationPct >= 80 ? '#B02020' : utilisationPct >= 40 ? '#f59e0b' : '#22c55e',
                borderRadius: '3px', transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#111111' }}>{utilisationPct}%</span>
          </div>
        </td>
        <td style={{ padding: '18px 20px', textAlign: 'center' }}>
          {(() => {
            // Use computed tauxGermination (best from tests or manual)
            let taux = s.tauxGermination != null ? s.tauxGermination : s.tauxManuel;
            return taux != null ? (
              <span style={{
                padding: '5px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 700,
                backgroundColor: taux >= 70 ? '#E8F5E9' : taux >= 40 ? '#FFF8E1' : '#FFEBEE',
                color: taux >= 70 ? '#008030' : taux >= 40 ? '#8D6E00' : '#B02020',
              }}>
                <TestTube size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                {taux}%
              </span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                <span style={{ fontSize: '13px', color: '#9ca3af' }}>—</span>
                {(user?.role === 'admin' || user?.role === 'employe') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openGerminationModal(s);
                    }}
                    title="Définir un taux de germination"
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fde68a'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef3c7'; }}
                  >
                    <TestTube size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                    Définir
                  </button>
                )}
              </div>
            );
          })()}
        </td>
        <td style={{ padding: '18px 20px', textAlign: 'center' }}>
          <span style={{
            padding: '8px 18px', borderRadius: '8px', fontSize: '15px', fontWeight: 800,
            backgroundColor: cfg.bg, color: cfg.color, border: `2px solid ${cfg.border}`,
            display: 'inline-block', minWidth: '100px', letterSpacing: '0.02em',
          }}>
            {cfg.label}
          </span>
        </td>
        <td style={{ padding: '18px 20px' }}>
          <span style={{ fontSize: '14px', color: '#111111' }}>
            {s.dateReception ? new Date(s.dateReception).toLocaleDateString('fr-FR') : '-'}
          </span>
        </td>
        <td style={{ padding: '18px 20px', textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            {(user?.role === 'admin' || user?.role === 'employe') && s.quantiteRestante > 0 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openMovementModal(s);
                  }}
                  title="Créer un mouvement (sortie, bon de passage)"
                  style={{
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#8D6E00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#6d5400'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#8D6E00'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <ArrowRight size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/semis/new?stockId=${s._id}`);
                  }}
                  title="Sortie en pépinière (créer un semis)"
                  style={{
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1565C0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0d47a1'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1565C0'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 1l4 4-4 4" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <path d="M7 23l-4-4 4-4" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                </button>
              </>
            )}
            <Link
              to={`/stock/${s._id}`}
              style={{
                padding: '8px 14px',
                backgroundColor: '#008030',
                color: 'white',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Détails
            </Link>
          </div>
        </td>
      </tr>
    );
  };

  // ── Table header (reused in flat and grouped views) ──
  const renderTableHeader = () => (
    <thead>
      <tr style={{ backgroundColor: '#f9fafb' }}>
        <th scope="col" onClick={() => handleSort('code')} style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>
          Code<SortIcon field="code" />
        </th>
        <th scope="col" onClick={() => handleSort('variete.nom')} style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>
          Variété<SortIcon field="variete.nom" />
        </th>
        <th scope="col" onClick={() => handleSort('fournisseur.nom')} style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>
          Fournisseur<SortIcon field="fournisseur.nom" />
        </th>
        <th scope="col" onClick={() => handleSort('quantiteInitiale')} style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>
          Quantité initiale<SortIcon field="quantiteInitiale" />
        </th>
        <th scope="col" style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>
          Restant
        </th>
        <th scope="col" style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>
          Utilisation
        </th>
        <th scope="col" style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>
          Germination
        </th>
        <th scope="col" style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>
          Statut
        </th>
        <th scope="col" onClick={() => handleSort('dateReception')} style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>
          Réception<SortIcon field="dateReception" />
        </th>
        <th scope="col" style={{ textAlign: 'right', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>
          Actions
        </th>
      </tr>
    </thead>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* ═══ Header ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#222222', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Warehouse size={32} color="#008030" />
            Stock de Semences
          </h1>
          <p style={{ fontSize: '18px', color: '#222222', margin: '4px 0 0' }}>
            Gestion du stock central de semences SICAM — entrées, sorties et statistiques
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'employe') && (
          <Link
            to="/stock/new/batch"
            style={{
              padding: '12px 20px',
              backgroundColor: '#008030',
              color: 'white',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Package size={18} />
            + Nouvelle entrée
          </Link>
        )}
      </div>

      {/* ═══ Tabs ═══ */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '24px',
        backgroundColor: '#E8F5E9', borderRadius: '12px', padding: '4px',
        width: 'fit-content',
      }}>
        <button
          onClick={() => setActiveTab('stock')}
          style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            backgroundColor: activeTab === 'stock' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'stock' ? '#008030' : '#222222',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          <Warehouse size={16} />
          Stock
          <span style={{
            padding: '2px 8px', borderRadius: '4px',
            backgroundColor: activeTab === 'stock' ? '#E8F5E9' : 'rgba(0,0,0,0.06)',
            fontSize: '12px',
          }}>{stockList.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('mouvements')}
          style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            backgroundColor: activeTab === 'mouvements' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'mouvements' ? '#008030' : '#222222',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          <ArrowRight size={16} />
          Mouvements
          <span style={{
            padding: '2px 8px', borderRadius: '4px',
            backgroundColor: activeTab === 'mouvements' ? '#E8F5E9' : 'rgba(0,0,0,0.06)',
            fontSize: '12px',
          }}>{movements.length}</span>
        </button>
      </div>

      {/* ═══ KPI Cards (always visible) ═══ */}
      {stats && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px', marginBottom: '24px',
        }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #C8E6C9' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Entrées totales</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#222222', marginTop: '2px' }}>{stats.totalEntries}</div>
            <div style={{ fontSize: '11px', color: '#111111', marginTop: '2px' }}>{stats.totalInitial.toLocaleString()} graines</div>
          </div>
          <div style={{ background: '#E8F5E9', borderRadius: '12px', padding: '18px 20px', border: '1px solid #C8E6C9' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#008030', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disponible</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#008030', marginTop: '2px' }}>{stats.disponibleQte.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#006625', marginTop: '2px' }}>{stats.statusBreakdown.disponible} entrées</div>
          </div>
          <div style={{ background: '#E3F2FD', borderRadius: '12px', padding: '18px 20px', border: '1px solid #90CAF9' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#1565C0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>En usage</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1565C0', marginTop: '2px' }}>{stats.enUsageQte.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#1565C0', marginTop: '2px' }}>{stats.statusBreakdown.en_usage} entrées</div>
          </div>
          <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '18px 20px', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Sprout size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Utilisé
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#92400e', marginTop: '2px' }}>{stats.totalUtilise.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#92400e', marginTop: '2px' }}>{stats.tauxUtilisationGlobal}% du total</div>
          </div>
          <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '18px 20px', border: '1px solid #a7f3d0' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#006625', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <ClipboardList size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Sorties pépinières
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#006625', marginTop: '2px' }}>{stats.totalSortiePepiniere.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#006625', marginTop: '2px' }}>{stats.mouvementCounts.sortie_pepiniere} mouvements</div>
          </div>
          <div style={{ background: '#FFF8E1', borderRadius: '12px', padding: '18px 20px', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#8D6E00', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <FileText size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Bon de passage
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#8D6E00', marginTop: '2px' }}>{stats.totalBonPassage.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#8D6E00', marginTop: '2px' }}>{stats.mouvementCounts.bon_passage} documents</div>
          </div>
          <div style={{ background: '#f3e8ff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e9d5ff' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <TestTube size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              Tests germination
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#7c3aed', marginTop: '2px' }}>{stats.totalTestGermination.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: '#7c3aed', marginTop: '2px' }}>{stats.mouvementCounts.test_germination} tests</div>
          </div>
        </div>
      )}

      {/* ═══ Yield Analysis Card ═══ */}
      {stats && stats.yieldByVariete && stats.yieldByVariete.length > 0 && (
        <div style={{
          background: 'white', borderRadius: '12px', border: '1px solid #C8E6C9',
          padding: '20px', marginBottom: '24px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#222222', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sprout size={18} color="#008030" />
            Rendement par variété — Stock → Production
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {stats.yieldByVariete.map((entry) => (
              <div key={entry.variete?._id || entry.variete} style={{
                padding: '14px 16px', borderRadius: '10px',
                backgroundColor: entry.rendement >= 70 ? '#f0fdf4' : entry.rendement >= 40 ? '#fffbeb' : '#fef2f2',
                border: `1px solid ${entry.rendement >= 70 ? '#bbf7d0' : entry.rendement >= 40 ? '#fde68a' : '#fecaca'}`,
              }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', marginBottom: '6px' }}>
                  {entry.variete?.nom || '—'}
                </div>
                <div style={{ fontSize: '13px', color: '#111111' }}>
                  Planté: <strong>{entry.totalPlanted.toLocaleString()}</strong> →
                  Produit: <strong>{entry.totalProduced.toLocaleString()}</strong>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: entry.rendement >= 70 ? '#008030' : entry.rendement >= 40 ? '#8D6E00' : '#B02020' }}>
                  {entry.rendement !== null ? `${entry.rendement}%` : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Tab Content ═══ */}
      {activeTab === 'stock' && (
        <div className={classicMode ? 'classic-table' : ''} style={{
          backgroundColor: 'white',
          border: '1px solid #C8E6C9',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          {/* ── Filters bar ── */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
          }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#111111' }} />
              <input
                type="text"
                placeholder="Rechercher par code, variété, fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '10px 16px 10px 42px',
                  border: '1px solid #d1d5db', borderRadius: '8px',
                  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                  color: '#111111',
                }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#111111', cursor: 'pointer', fontSize: '16px' }}>×</button>
              )}
            </div>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
              <option value="all">Tous les statuts</option>
              <option value="disponible">Disponible</option>
              <option value="en_usage">En usage</option>
              <option value="epuise">Épuisé</option>
            </select>

            <select value={varFilter} onChange={(e) => setVarFilter(e.target.value)} style={selectStyle}>
              <option value="all">Toutes variétés</option>
              {varietes.map((v) => (
                <option key={v._id} value={v._id}>{v.nom}</option>
              ))}
            </select>

            <select value={fournisseurFilter} onChange={(e) => setFournisseurFilter(e.target.value)} style={selectStyle}>
              <option value="all">Tous les fournisseurs</option>
              {fournisseurs.filter(f => f.statut === 'actif').map((f) => (
                <option key={f._id} value={f._id}>{f.nom}</option>
              ))}
            </select>

            {/* ── Group By selector ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px',
              backgroundColor: groupBy !== 'none' ? '#E8F5E9' : '#f3f4f6',
              border: groupBy !== 'none' ? '1px solid #C8E6C9' : '1px solid #d1d5db',
            }}>
              {groupBy === 'fournisseur' ? <Users size={14} color="#008030" /> : groupBy === 'variete' ? <Tag size={14} color="#008030" /> : <span style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Grouper:</span>}
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                style={{
                  border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 600,
                  color: groupBy !== 'none' ? '#008030' : '#6b7280',
                  cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
                }}
              >
                <option value="none">Sans regroupement</option>
                <option value="fournisseur">Par fournisseur</option>
                <option value="variete">Par variété</option>
              </select>
            </div>

            {/* ── Aggregate toggle (only when grouped) ── */}
            {groupBy !== 'none' && (
              <button
                onClick={() => { setAggregateView(!aggregateView); setAggregateSearch(''); }}
                style={{
                  padding: '8px 14px', borderRadius: '8px',
                  border: aggregateView ? '2px solid #008030' : '1px solid #d1d5db',
                  backgroundColor: aggregateView ? '#E8F5E9' : 'white',
                  color: aggregateView ? '#008030' : '#6b7280',
                  fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { if (!aggregateView) e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
                onMouseLeave={(e) => { if (!aggregateView) e.currentTarget.style.backgroundColor = 'white'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                {aggregateView ? 'Vue détaillée' : 'Agréger'}
              </button>
            )}

            {/* ── Aggregate search (only when aggregate view is active) ── */}
            {aggregateView && groupBy !== 'none' && (
              <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '160px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#111111' }} />
                <input
                  type="text"
                  placeholder={`Rechercher ${groupBy === 'fournisseur' ? 'un fournisseur' : 'une variété'}...`}
                  value={aggregateSearch}
                  onChange={(e) => setAggregateSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 34px 10px 36px',
                    border: '2px solid #008030', borderRadius: '8px',
                    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                    color: '#111111', backgroundColor: '#f0fdf4',
                  }}
                />
                {aggregateSearch && (
                  <button onClick={() => setAggregateSearch('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#111111', cursor: 'pointer', fontSize: '16px' }}>×</button>
                )}
              </div>
            )}

            <ExportButton
              user={user}
              filename="stock-semences"
              columns={[
                { accessor: 'code', header: 'Code' },
                { accessor: 'variete.nom', header: 'Variété' },
                { accessor: 'fournisseur.nom', header: 'Fournisseur' },
                { accessor: 'quantiteInitiale', header: 'Quantité initiale' },
                { accessor: 'quantiteRestante', header: 'Quantité restante' },
                { accessor: 'statut', header: 'Statut' },
                { accessor: 'dateReception', header: 'Date réception' },
              ]}
              data={filteredStock}
              mapRow={(s) => [
                s.code || '-',
                s.variete?.nom || '-',
                s.fournisseur?.nom || '—',
                s.quantiteInitiale?.toString() || '-',
                s.quantiteRestante?.toString() || '-',
                STATUS_CONFIG[s.statut]?.label || s.statut || '-',
                s.dateReception ? new Date(s.dateReception).toLocaleDateString('fr-FR') : '-',
              ]}
            />
            <span style={{ fontSize: '12px', color: '#111111' }}>
              {filteredStock.length} entrée{filteredStock.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ── Table ── */}
          <div className="table-scroll" style={{ overflowX: 'auto' }}>
            {groupBy === 'none' ? (
              /* ── Flat table ── */
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                {renderTableHeader()}
                <tbody>
                  {sortedData.length > 0 ? sortedData.map((s) => renderStockRow(s)) : (
                    <tr>
                      <td colSpan="10" style={{ padding: '48px 24px', textAlign: 'center' }}>
                        <p style={{ fontSize: '16px', color: '#222222', margin: 0 }}>
                          {searchTerm || statusFilter !== 'all' || varFilter !== 'all' || fournisseurFilter !== 'all'
                            ? 'Aucune entrée trouvée avec ces filtres.'
                            : 'Aucun stock de semences pour le moment.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              /* ── Grouped table ── */
              <div>                  {groupedData && groupedData.length > 0 ? (
                    /* ── Empty aggregate search result ── */
                    aggregateView && filteredGroupedData && filteredGroupedData.length === 0 ? (
                      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                        <p style={{ fontSize: '16px', color: '#222222', margin: 0 }}>
                          Aucun {groupBy === 'fournisseur' ? 'fournisseur' : 'variété'} trouvé pour « {aggregateSearch} ».
                        </p>
                      </div>
                    ) :
                  aggregateView ? (
                    /* ── Aggregated view: one summary row per group ── */
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                          <th scope="col" style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>
                            {groupBy === 'fournisseur' ? 'Fournisseur' : 'Variété'}
                          </th>
                          <th scope="col" style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>
                            Entrées
                          </th>
                          <th scope="col" style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>
                            Quantité totale
                          </th>
                          <th scope="col" style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>
                            Restant total
                          </th>
                          <th scope="col" style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>
                            Utilisation
                          </th>
                          <th scope="col" style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>
                            Germ. moy.
                          </th>
                          <th scope="col" style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>
                            Statut
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGroupedData.map((group) => {
                          const gCfg = STATUS_CONFIG[group.dominantStatus] || STATUS_CONFIG.disponible;
                          return (
                            <tr
                              key={group.key}
                              onClick={() => {
                                // Apply group as filter
                                if (groupBy === 'fournisseur') setFournisseurFilter(group.items[0]?.fournisseur?._id || 'all');
                                else if (groupBy === 'variete') setVarFilter(group.items[0]?.variete?._id || 'all');
                                setGroupBy('none');
                                setAggregateView(false);
                              }}
                              style={{
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                            >
                              <td style={{ padding: '18px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {groupBy === 'fournisseur' ? <Users size={18} color="#008030" /> : <Tag size={18} color="#008030" />}
                                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>
                                    {group.label}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                                <span style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>
                                  {group.entryCount}
                                </span>
                              </td>
                              <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                                <span style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>
                                  {group.totalInitial.toLocaleString()}
                                </span>
                              </td>
                              <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                                <span style={{ fontSize: '16px', fontWeight: 700, color: group.totalRestant > 0 ? '#008030' : '#9ca3af' }}>
                                  {group.totalRestant.toLocaleString()}
                                </span>
                              </td>
                              <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                  <div style={{ width: '60px', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                      width: `${group.utilisation}%`, height: '100%',
                                      backgroundColor: group.utilisation >= 80 ? '#B02020' : group.utilisation >= 40 ? '#f59e0b' : '#22c55e',
                                      borderRadius: '3px', transition: 'width 0.3s ease',
                                    }} />
                                  </div>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#111111' }}>{group.utilisation}%</span>
                                </div>
                              </td>
                              <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                                {group.avgGermination != null ? (
                                  <span style={{
                                    padding: '5px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 700,
                                    backgroundColor: group.avgGermination >= 70 ? '#E8F5E9' : group.avgGermination >= 40 ? '#FFF8E1' : '#FFEBEE',
                                    color: group.avgGermination >= 70 ? '#008030' : group.avgGermination >= 40 ? '#8D6E00' : '#B02020',
                                  }}>
                                    <TestTube size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                    {group.avgGermination}%
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '13px', color: '#9ca3af' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                  {group.statuses.disponible > 0 && (
                                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#E8F5E9', color: '#008030' }}>
                                      {group.statuses.disponible} disp.
                                    </span>
                                  )}
                                  {group.statuses.en_usage > 0 && (
                                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#E3F2FD', color: '#1565C0' }}>
                                      {group.statuses.en_usage} usage
                                    </span>
                                  )}
                                  {group.statuses.epuise > 0 && (
                                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, backgroundColor: '#FFEBEE', color: '#B02020' }}>
                                      {group.statuses.epuise} épuisé
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    /* ── Detailed grouped view: collapsible sections ── */
                    groupedData.map((group) => {
                      const isCollapsed = collapsedGroups[group.key];
                      return (
                        <div key={group.key} style={{ borderBottom: '1px solid #E8F5E9' }}>
                          {/* ── Group header ── */}
                          <div
                            onClick={() => toggleGroup(group.key)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '12px',
                              padding: '14px 20px', backgroundColor: '#f0fdf4',
                              cursor: 'pointer', userSelect: 'none',
                              borderBottom: isCollapsed ? '1px solid #C8E6C9' : 'none',
                              transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dcfce7'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
                          >
                            {isCollapsed ? <ChevronRight size={18} color="#008030" /> : <ChevronDown size={18} color="#008030" />}
                            {groupBy === 'fournisseur' ? <Users size={16} color="#008030" /> : <Tag size={16} color="#008030" />}
                            <span style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', flex: 1 }}>
                              {group.label}
                            </span>
                            <span style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                              backgroundColor: '#E8F5E9', color: '#008030',
                            }}>
                              {group.items.length} entrée{group.items.length > 1 ? 's' : ''}
                            </span>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
                              <span>Initial: <strong style={{ color: '#1f2937' }}>{group.totalInitial.toLocaleString()}</strong></span>
                              <span>Restant: <strong style={{ color: '#008030' }}>{group.totalRestant.toLocaleString()}</strong></span>
                              <span>Utilisé: <strong style={{ color: group.utilisation >= 80 ? '#B02020' : '#92400e' }}>{group.utilisation}%</strong></span>
                            </div>
                          </div>

                          {/* ── Group rows ── */}
                          {!isCollapsed && (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              {renderTableHeader()}
                              <tbody>
                                {group.items.map((s) => renderStockRow(s))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      );
                    })
                  )                  ) : (
                  <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', color: '#222222', margin: 0 }}>
                      {searchTerm || statusFilter !== 'all' || varFilter !== 'all' || fournisseurFilter !== 'all' || aggregateSearch.trim()
                        ? 'Aucune entrée trouvée avec ces filtres.'
                        : 'Aucun stock de semences pour le moment.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Movements Tab ═══ */}
      {activeTab === 'mouvements' && (
        <div className={classicMode ? 'classic-table' : ''} style={{
          backgroundColor: 'white',
          border: '1px solid #C8E6C9',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          {/* ── Header with export ── */}
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#222222', margin: 0 }}>
              Historique des mouvements
            </h3>
            <ExportButton
              user={user}
              filename="mouvements-stock"
              columns={[
                { accessor: 'dateMouvement', header: 'Date' },
                { accessor: 'type', header: 'Type' },
                { accessor: 'stockSemence.code', header: 'Stock' },
                { accessor: 'quantite', header: 'Quantité' },
                { accessor: 'destination', header: 'Destination' },
                { accessor: 'reference', header: 'Réf. / Motif' },
                { accessor: 'createdBy.nom', header: 'Par' },
              ]}
              data={movements}
              mapRow={(m) => {
                const typeLabel = MOVEMENT_TYPE_CONFIG[m.type]?.label || m.type || '-';
                const dest = m.type === 'sortie_pepiniere' ? (m.pepiniere?.nom || '—') : '-';
                const ref = m.type === 'bon_passage' ? (m.referenceBon || m.motif || '-') : (m.type === 'test_germination' ? m.motif || '-' : '-');
                return [
                  m.dateMouvement ? new Date(m.dateMouvement).toLocaleDateString('fr-FR') : '-',
                  typeLabel,
                  m.stockSemence?.code || '-',
                  m.quantite?.toLocaleString('fr-FR') || '-',
                  dest,
                  ref,
                  m.createdBy?.nom || 'Système',
                ];
              }}
            />
          </div>
          <div className="table-scroll" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th scope="col" style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', textAlign: 'center' }}>Date</th>
                  <th scope="col" style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', textAlign: 'center' }}>Type</th>
                  <th scope="col" style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', textAlign: 'center' }}>Stock</th>
                  <th scope="col" style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', textAlign: 'center' }}>Quantité</th>
                  <th scope="col" style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', textAlign: 'center' }}>Destination</th>
                  <th scope="col" style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', textAlign: 'center' }}>Réf. / Motif</th>
                  <th scope="col" style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', textAlign: 'center' }}>Par</th>
                </tr>
              </thead>
              <tbody>
                {movements.length > 0 ? movements.map((m) => {
                  const cfg = MOVEMENT_TYPE_CONFIG[m.type] || MOVEMENT_TYPE_CONFIG.bon_passage;
                  return (
                    <tr
                      key={m._id}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                    >
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#111111' }}>
                          {m.dateMouvement ? new Date(m.dateMouvement).toLocaleDateString('fr-FR') : '-'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                          backgroundColor: cfg.bg, color: cfg.color,
                        }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: '#008030' }}>
                          {m.stockSemence?.code || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>
                          {m.quantite?.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        {m.type === 'sortie_pepiniere' ? (
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                              {m.pepiniere?.nom || '—'}
                            </span>
                            {m.semisCree && (
                              <div style={{ fontSize: '11px', color: '#008030', fontFamily: 'monospace' }}>
                                Semis: {m.semisCree.code}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#111111' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#111111' }}>
                          {m.referenceBon || m.motif || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#111111' }}>
                          {m.createdBy?.nom || 'Système'}
                        </span>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="7" style={{ padding: '48px 24px', textAlign: 'center' }}>
                      <p style={{ fontSize: '16px', color: '#222222', margin: 0 }}>
                        Aucun mouvement pour le moment.
                      </p>
                      <p style={{ fontSize: '14px', color: '#111111', marginTop: '4px' }}>
                        Les mouvements sont créés lors des sorties de stock.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Movement Modal ═══ */}
      <Modal isOpen={movementModalOpen} onClose={closeMovementModal} title="Sortie de stock" maxWidth="520px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedStock && (
            <div style={{
              padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '10px',
              border: '1px solid #bbf7d0',
            }}>
              <div style={{ fontSize: '13px', color: '#006625' }}>
                Stock: <strong>{selectedStock.code}</strong> — {selectedStock.variete?.nom || '—'}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937', marginTop: '4px' }}>
                Disponible: {selectedStock.quantiteRestante?.toLocaleString()} graines
              </div>
            </div>
          )}

          {/* Type selection */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleMovementChange('type', 'sortie_pepiniere')}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                border: movementForm.type === 'sortie_pepiniere' ? '2px solid #008030' : '1px solid #d1d5db',
                backgroundColor: movementForm.type === 'sortie_pepiniere' ? '#f0fdf4' : 'white',
                color: movementForm.type === 'sortie_pepiniere' ? '#008030' : '#222222',
                display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
              }}
            >
              <Sprout size={18} />
              Sortie pépinière
            </button>
            <button
              onClick={() => handleMovementChange('type', 'bon_passage')}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                border: movementForm.type === 'bon_passage' ? '2px solid #8D6E00' : '1px solid #d1d5db',
                backgroundColor: movementForm.type === 'bon_passage' ? '#FFF8E1' : 'white',
                color: movementForm.type === 'bon_passage' ? '#8D6E00' : '#222222',
                display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
              }}
            >
              <FileText size={18} />
              Bon de passage
            </button>
          </div>

          {/* Quantity */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
              Quantité *
            </label>
            <input
              type="number"
              value={movementForm.quantite}
              onChange={(e) => handleMovementChange('quantite', e.target.value)}
              min="1"
              max={selectedStock?.quantiteRestante || 0}
              style={{
                width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
              }}
              placeholder={`Max: ${selectedStock?.quantiteRestante?.toLocaleString() || '0'}`}
            />
          </div>

          {/* Date */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
              Date de sortie
            </label>
            <input
              type="date"
              value={movementForm.dateMouvement}
              onChange={(e) => handleMovementChange('dateMouvement', e.target.value)}
              style={{
                width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Pepiniere (for sortie_pepiniere) */}
          {movementForm.type === 'sortie_pepiniere' && (
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
                Pépinière de destination *
              </label>
              <select
                value={movementForm.pepiniere}
                onChange={(e) => handleMovementChange('pepiniere', e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                  fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                  backgroundColor: 'white',
                }}
                required
              >
                <option value="">Sélectionnez une pépinière</option>
                {pepinieres.map((p) => (
                  <option key={p._id} value={p._id}>{p.nom}</option>
                ))}
              </select>
              <p style={{ fontSize: '12px', color: '#111111', margin: '6px 0 0' }}>
                Un semis sera automatiquement créé dans cette pépinière.
              </p>
            </div>
          )}

          {/* Reference / Motif (for bon_passage) */}
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
                <input
                  type="text"
                  value={movementForm.referenceBon}
                  readOnly
                  style={{
                    width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                    fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                    backgroundColor: '#f9fafb', color: '#6b7280', cursor: 'not-allowed',
                  }}
                  placeholder="Généré automatiquement"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
                  Motif
                </label>
                <textarea
                  value={movementForm.motif}
                  onChange={(e) => handleMovementChange('motif', e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                    fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                    minHeight: '60px', resize: 'vertical',
                  }}
                  placeholder="Motif de la sortie..."
                />
              </div>
            </>
          )}

          {/* Error */}
          {movementError && (
            <div style={{
              padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px', color: '#991b1b', fontSize: '14px',
            }}>
              {movementError}
            </div>
          )}

          {/* Buttons */}
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

      {/* ═══ Quick Germination Modal ═══ */}
      <Modal isOpen={germinationModalOpen} onClose={closeGerminationModal} title="Taux de germination" maxWidth="440px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedStockForGerm && (
            <div style={{
              padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: '8px',
              border: '1px solid #bbf7d0', fontSize: '13px',
            }}>
              <strong>{selectedStockForGerm.code}</strong> — {selectedStockForGerm.variete?.nom || '—'}
            </div>
          )}
          <p style={{ fontSize: '13px', color: '#222222', margin: 0 }}>
            Saisissez un taux de germination estimé (0-100%). Un test formel peut être ajouté depuis la page détail.
          </p>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
              Taux de germination (%)
            </label>
            <input
              type="number" min="0" max="100" step="0.1"
              value={quickTauxManuel}
              onChange={(e) => setQuickTauxManuel(e.target.value)}
              placeholder="Ex: 85"
              style={{
                width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '10px',
                fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
              }}
              autoFocus
            />
          </div>
          {germinationError && (
            <div style={{
              padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px', color: '#991b1b', fontSize: '14px',
            }}>
              {germinationError}
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button onClick={closeGerminationModal}
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
                padding: '12px 20px', backgroundColor: submittingGermination ? '#9ca3af' : '#92400e', color: 'white',
                border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700,
                cursor: submittingGermination ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>
              {submittingGermination ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StockSemences;
