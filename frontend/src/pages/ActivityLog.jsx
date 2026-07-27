/**
 * ActivityLog — Page "Production" : Suivi complet de la production
 * =================================================================
 * Tableau de bord pour suivre l'ensemble du cycle de production :
 *   - Lots en cours → prêts → récoltés → livrés
 *   - Indicateurs clés, pipeline visuel, échéances à venir
 *   - Recherche et filtres par statut, pépinière, variété
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import ExportButton from '../components/ExportButton';
import HistoryCharts from '../components/charts/HistoryCharts';
import { Search, Sprout, Tractor, Calendar, ClipboardList, CheckCircle, Truck, Wheat } from 'lucide-react';
import useSort from '../hooks/useSort';
import lotService from '../services/lotService';
import productionService from '../services/productionService';
import { fmtDate, fmtNumber } from '../utils/dates';

const LOT_STATUS_LABELS = {
  en_cours: { label: 'En cours',    bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: 'en_cours' },
  pret:     { label: 'Prêt',        bg: '#dcfce7', color: '#006625', border: '#a7f3d0', icon: 'pret' },
  recolte:  { label: 'Récolté',     bg: '#dcfce7', color: '#006625', border: '#a7f3d0', icon: 'recolte' },
  livre:    { label: 'Livré',        bg: '#f0fdf4', color: '#006625', border: '#a7f3d0', icon: 'livre' },
  annule:   { label: 'Annulé',       bg: '#fee2e2', color: '#991b1b', border: '#fecaca', icon: 'annule' },
};

/* ── Pipeline steps order ── */
const PIPELINE_STEPS = ['en_cours', 'pret', 'recolte', 'livre'];

const ActivityLog = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pepFilter, setPepFilter] = useState('all');
  const [varFilter, setVarFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { user, classicMode } = useAuth();

  // ── Production Records (auto-saved on delivery) ──
  const [productionRecords, setProductionRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  // ── Date filters for Registre de production ──
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  useEffect(() => {
    fetchRecords();
    fetchProductionRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data: allLots } = await lotService.getAll();
      const prodLots = allLots.filter((l) => l.type === 'production');
      setRecords(prodLots);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductionRecords = async () => {
    try {
      setRecordsLoading(true);
      const { data } = await productionService.getAll();
      setProductionRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setProductionRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  };

  /* ── Filtered production records (by date de livraison) ── */
  const filteredProdRecords = useMemo(() => {
    return productionRecords.filter((rec) => {
      if (!dateDebut && !dateFin) return true;
      if (!rec.dateLivraison) return false;
      const d = new Date(rec.dateLivraison);
      d.setHours(0, 0, 0, 0);
      if (dateDebut) {
        const start = new Date(dateDebut);
        start.setHours(0, 0, 0, 0);
        if (d < start) return false;
      }
      if (dateFin) {
        const end = new Date(dateFin);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [productionRecords, dateDebut, dateFin]);

  /* ── Derived filter data ── */
  const filterPepinieres = useMemo(
    () => [...new Map(records.map((r) => [r.semis?.pepiniere?._id, { _id: r.semis?.pepiniere?._id, nom: r.semis?.pepiniere?.nom }])).values()].filter((p) => p._id),
    [records]
  );

  const varietes = useMemo(
    () => [...new Map(records.map((r) => [r.semis?.variete?._id, { _id: r.semis?.variete?._id, nom: r.semis?.variete?.nom }])).values()].filter((v) => v._id),
    [records]
  );

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const pepMatch = pepFilter === 'all' || r.semis?.pepiniere?._id === pepFilter;
      const varMatch = varFilter === 'all' || r.semis?.variete?._id === varFilter;
      const statusMatch = statusFilter === 'all' || r.statut === statusFilter;
      if (!pepMatch || !varMatch || !statusMatch) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        r.code?.toLowerCase().includes(q) ||
        r.semis?.variete?.nom?.toLowerCase().includes(q) ||
        r.semis?.pepiniere?.nom?.toLowerCase().includes(q) ||
        r.lotSemenceParent?.code?.toLowerCase().includes(q)
      );
    });
  }, [records, searchTerm, pepFilter, varFilter, statusFilter]);

  /* ── Status breakdown ── */
  const statusCounts = useMemo(() => {
    const counts = { en_cours: 0, pret: 0, recolte: 0, livre: 0, annule: 0 };
    records.forEach((r) => {
      if (counts[r.statut] !== undefined) counts[r.statut]++;
    });
    return counts;
  }, [records]);

  /* ── Upcoming harvests (lots en_cours or pret with expected dates) ── */
  const upcomingHarvests = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return records
      .filter((r) => {
        if (r.statut !== 'en_cours' && r.statut !== 'pret') return false;
        if (!r.expectedReadyDateMin) return false;
        const readyDate = new Date(r.expectedReadyDateMin);
        return readyDate >= now && readyDate <= thirtyDaysFromNow;
      })
      .sort((a, b) => new Date(a.expectedReadyDateMin) - new Date(b.expectedReadyDateMin))
      .slice(0, 8);
  }, [records]);

  /* ── Enhanced stats ── */
  const stats = useMemo(() => {
    const totalRecords = records.length;
    const totalPlants = records.reduce((sum, r) => sum + (r.nombrePlantsProduits || 0), 0);
    const totalLivrees = records.reduce((sum, r) => sum + (r.quantiteLivree || 0), 0);

    // Average germination rate from parent lots
    const tauxValues = records
      .map((r) => {
        const parent = r.lotSemenceParent;
        if (parent?.tests && parent.tests.length > 0) {
          const t = parent.tests[0];
          if (t && t.grainesTestes > 0) return (t.grainesGermees / t.grainesTestes) * 100;
        }
        if (parent?.tauxManuel != null) return parent.tauxManuel;
        return null;
      })
      .filter((r) => r !== null);
    const avgRate = tauxValues.length > 0 ? tauxValues.reduce((a, b) => a + b, 0) / tauxValues.length : null;

    return { totalRecords, totalPlants, totalLivrees, avgRate };
  }, [records, statusCounts]);

  /* ── Semis groups for per-semis aggregation table ── */
  const semisGroupsArr = useMemo(() => {
    const semisGroups = {};
    filteredProdRecords.forEach((rec) => {
      const key = rec.semisCode || 'inconnu';
      if (!semisGroups[key]) {
        semisGroups[key] = { semisCode: key, pepiniere: rec.pepiniere, variete: rec.variete, lots: 0, plante: 0, produit: 0, livre: 0 };
      }
      semisGroups[key].lots++;
      semisGroups[key].plante += rec.quantitePlantee || 0;
      semisGroups[key].produit += rec.quantiteProduite || 0;
      semisGroups[key].livre += rec.quantiteLivree || 0;
    });
    return Object.values(semisGroups).sort((a, b) => b.produit - a.produit);
  }, [filteredProdRecords]);

  // Sort hooks
  const { sortedData: sortedFiltered, handleSort, SortIcon } = useSort(filtered, { defaultField: 'code' });
  const { sortedData: sortedProdRecords, handleSort: handleSortProd, SortIcon: SortIconProd } = useSort(filteredProdRecords, { defaultField: 'code' });
  const { sortedData: sortedSemisGroups, handleSort: handleSortGroup, SortIcon: SortIconGroup } = useSort(semisGroupsArr, { defaultField: 'code' });

  if (loading) return <Loading />;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* ═══ Header ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#222222', margin: 0 }}>
            <Sprout size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '10px', color: '#008030' }} />
            Production
          </h1>
          <p style={{ fontSize: '18px', color: '#222222', margin: '4px 0 0' }}>
            Suivi complet de la production — du semis à la livraison
          </p>
        </div>
        <span style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 18px', backgroundColor: '#E8F5E9', color: '#008030',
          borderRadius: '10px', fontSize: '13px', fontWeight: 600,
        }}>
          <ClipboardList size={18} />
          {productionRecords.length} production{productionRecords.length !== 1 ? 's' : ''} enregistrée{productionRecords.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ═══ KPI Cards ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #C8E6C9' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#222222', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total lots</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#222222' }}>{stats.totalRecords}</div>
        </div>
        <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '18px 20px', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}><Sprout size={16} /> En cours</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#92400e' }}>{statusCounts.en_cours}</div>
        </div>
        <div style={{ background: '#dcfce7', borderRadius: '12px', padding: '18px 20px', border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#006625', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} /> Prêts</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#006625' }}>{statusCounts.pret}</div>
        </div>
        <div style={{ background: '#E8F5E9', borderRadius: '12px', padding: '18px 20px', border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#006625', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}><Wheat size={16} /> Récoltés</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#006625' }}>{statusCounts.recolte}</div>
        </div>
        <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '18px 20px', border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#006625', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}><Truck size={16} /> Livrés</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#222222' }}>{statusCounts.livre}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #C8E6C9' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#222222', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}><Sprout size={16} /> Plants produits</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#008030' }}>{fmtNumber(stats.totalPlants)}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #C8E6C9' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#222222', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantité livrée</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#008030' }}>{fmtNumber(stats.totalLivrees)}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #C8E6C9' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#222222', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Taux germination</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: stats.avgRate !== null ? (stats.avgRate >= 70 ? '#008030' : stats.avgRate >= 40 ? '#8D6E00' : '#B02020') : '#9ca3af' }}>
            {stats.avgRate !== null ? `${stats.avgRate.toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>

      {/* ═══ Pipeline Visualization ═══ */}
      {records.length > 0 && (
        <div style={{
          backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9',
          padding: '20px', marginBottom: '24px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#222222', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tractor size={18} color="#008030" />
            Pipeline de production
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {PIPELINE_STEPS.map((step, idx) => {
              const cfg = LOT_STATUS_LABELS[step];
              const count = statusCounts[step];
              const total = Math.max(records.length, 1);
              const pct = Math.round((count / total) * 100);
              return (
                <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '100%', height: '36px', borderRadius: '8px',
                    backgroundColor: step === 'en_cours' ? '#fef3c7' : step === 'pret' ? '#dcfce7' : step === 'recolte' ? '#E8F5E9' : '#f0fdf4',
                    border: `2px solid ${cfg.border}`,
                    position: 'relative', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {idx > 0 && (
                      <div style={{
                        position: 'absolute', left: '-4px', top: '50%', transform: 'translateY(-50%)',
                        width: '8px', height: '8px', borderTop: `2px solid ${cfg.border}`,
                        borderRight: `2px solid ${cfg.border}`, backgroundColor: 'white',
                        rotate: '45deg', zIndex: 1,
                      }} />
                    )}
                    <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.color, zIndex: 2 }}>
                      {(() => {
                        switch(cfg.icon) {
                          case 'en_cours': return <Sprout size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />;
                          case 'pret': return <CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />;
                          case 'recolte': return <Wheat size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />;
                          case 'livre': return <Truck size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />;
                          default: return null;
                        }
                      })()} {count}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#222222' }}>{cfg.label}</span>
                  <span style={{ fontSize: '10px', color: '#111111' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Upcoming Harvests ═══ */}
      {upcomingHarvests.length > 0 && (
        <div style={{
          backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9',
          padding: '20px', marginBottom: '24px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#222222', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="#1565C0" />
            Prochaines récoltes prévues (30 jours)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {upcomingHarvests.map((lot) => {
              const cfg = LOT_STATUS_LABELS[lot.statut] || LOT_STATUS_LABELS.en_cours;
              const daysUntil = Math.ceil((new Date(lot.expectedReadyDateMin) - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <Link
                  key={lot._id}
                  to={`/lots/${lot._id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 14px', borderRadius: '10px',
                    border: '1px solid #e5e7eb', textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; e.currentTarget.style.borderColor = '#C8E6C9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    backgroundColor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', flexShrink: 0,
                  }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#006625', fontFamily: 'monospace' }}>
                      {lot.code}
                    </div>
                    <div style={{ fontSize: '12px', color: '#222222' }}>
                      {lot.semis?.variete?.nom || '—'} — {lot.semis?.pepiniere?.nom || '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: daysUntil <= 7 ? '#B02020' : '#006625' }}>
                      {daysUntil <= 0 ? 'Aujourd\'hui' : `J-${daysUntil}`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#111111' }}>
                      {fmtDate(lot.expectedReadyDateMin)}
                    </div>
                  </div>
                  <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                    {cfg.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Charts (harvested/delivered lots only) ═══ */}
      <HistoryCharts lots={records.filter((r) => r.statut === 'recolte' || r.statut === 'livre')} />

      {/* ═══ Filters ═══ */}
      <div style={{
        backgroundColor: 'white', border: '1px solid #C8E6C9', borderRadius: '12px',
        padding: '16px 20px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#111111' }} />
          <input
            type="text"
            placeholder="Rechercher par code, variété, pépinière, lot..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '10px 16px 10px 42px',
              border: '1px solid #d1d5db', borderRadius: '8px',
              fontSize: '14px', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#111111', cursor: 'pointer', fontSize: '16px' }}
            >×</button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', background: 'white' }}
        >
          <option value="all">Tous les statuts</option>              <option value="en_cours"> En cours</option>
          <option value="pret"> Prêt</option>
          <option value="recolte"> Récolté</option>
          <option value="livre"> Livré</option>
          <option value="annule"> Annulé</option>
        </select>
        <select
          value={pepFilter}
          onChange={(e) => setPepFilter(e.target.value)}
          style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', background: 'white' }}
        >
          <option value="all">Toutes les pépinières</option>
          {filterPepinieres.map((p) => (
            <option key={p._id} value={p._id}>{p.nom}</option>
          ))}
        </select>
        <select
          value={varFilter}
          onChange={(e) => setVarFilter(e.target.value)}
          style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', background: 'white' }}
        >
          <option value="all">Toutes les variétés</option>
          {varietes.map((v) => (
            <option key={v._id} value={v._id}>{v.nom}</option>
          ))}
        </select>
<ExportButton
          user={user}
          filename="production"
          columns={[
            { accessor: 'code', header: 'Code' },
            { accessor: 'semis.variete.nom', header: 'Variété' },
            { accessor: 'semis.pepiniere.nom', header: 'Pépinière' },
            { accessor: 'statut', header: 'Statut' },
            { accessor: 'quantite', header: 'Quantité plantée' },
            { accessor: 'nombrePlantsProduits', header: 'Plants produits' },
            { accessor: 'dateRecolte', header: 'Date récolte' },
            { accessor: 'dateLivraison', header: 'Date livraison' },
          ]}
          data={filtered}
          mapRow={(r) => [
            r.code || '-',
            r.semis?.variete?.nom || '-',
            r.semis?.pepiniere?.nom || '-',
            LOT_STATUS_LABELS[r.statut]?.label || r.statut || '-',
            r.quantite?.toString() || '-',
            r.nombrePlantsProduits?.toString() || '-',
            r.dateRecolte ? fmtDate(r.dateRecolte) : '-',
            r.dateLivraison ? fmtDate(r.dateLivraison) : '-',
          ]}
        />
        <span style={{ fontSize: '13px', color: '#111111' }}>
          {filtered.length} lot{filtered.length !== 1 ? 's' : ''}
          {records.length > 0 && records.length !== filtered.length && (
            <span> / {records.length} total</span>
          )}
        </span>
      </div>

      {/* ═══ Table ═══ */}
      {filtered.length > 0 ? (
        <div className={classicMode ? 'classic-table table-scroll' : 'table-scroll'} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th scope="col" onClick={() => handleSort('code')} style={{ cursor: 'pointer', textAlign: 'center', padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Code Lot<SortIcon field="code" /></th>
                <th scope="col" onClick={() => handleSort('semis.variete.nom')} style={{ cursor: 'pointer', textAlign: 'center', padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Variété<SortIcon field="semis.variete.nom" /></th>
                <th scope="col" onClick={() => handleSort('semis.pepiniere.nom')} style={{ cursor: 'pointer', textAlign: 'center', padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Pépinière<SortIcon field="semis.pepiniere.nom" /></th>
                <th scope="col" onClick={() => handleSort('dateEntree')} style={{ cursor: 'pointer', textAlign: 'center', padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Planté le<SortIcon field="dateEntree" /></th>
                <th scope="col" onClick={() => handleSort('quantite')} style={{ cursor: 'pointer', textAlign: 'center', padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Qté plantée<SortIcon field="quantite" /></th>
                <th scope="col" style={{ textAlign: 'center', padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>Prévision récolte</th>
                <th scope="col" style={{ textAlign: 'center', padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>Résultat</th>
                <th scope="col" onClick={() => handleSort('lotSemenceParent.code')} style={{ cursor: 'pointer', textAlign: 'center', padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Lot parent<SortIcon field="lotSemenceParent.code" /></th>
                <th scope="col" onClick={() => handleSort('statut')} style={{ cursor: 'pointer', textAlign: 'center', padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>État<SortIcon field="statut" /></th>
                <th scope="col" style={{ textAlign: 'right', padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiltered.map((r) => {
                const cfg = LOT_STATUS_LABELS[r.statut] || LOT_STATUS_LABELS.en_cours;
                const isTerminal = r.statut === 'recolte' || r.statut === 'livre';

                // Germination rate from parent
                let tauxGermination = null;
                const parent = r.lotSemenceParent;
                if (parent?.tests && parent.tests.length > 0) {
                  const sorted = [...parent.tests].sort((a, b) => new Date(b.dateTest || 0) - new Date(a.dateTest || 0));
                  tauxGermination = sorted[0]?.tauxGermination;
                } else if (parent?.tauxManuel != null) {
                  tauxGermination = parent.tauxManuel;
                }

                const actualPlants = r.nombrePlantsProduits || 0;

                return (
                  <tr
                    key={r._id}
                    style={{
                      borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.15s ease', cursor: 'pointer',
                      opacity: r.statut === 'annule' ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#006625', fontFamily: 'monospace' }}>{r.code || '—'}</span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#222222' }}>{r.semis?.variete?.nom || '—'}</span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: '14px', color: '#111111' }}>{r.semis?.pepiniere?.nom || '—'}</span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: '13px', color: '#111111' }}>{r.dateEntree ? fmtDate(r.dateEntree) : '—'}</span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#111111' }}>{fmtNumber(r.quantite)}</span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {r.expectedReadyDateMin && r.expectedReadyDateMax ? (
                        <span style={{ fontSize: '12px', color: '#111111', fontWeight: 500 }}>
                          {fmtDate(r.expectedReadyDateMin)}
                          {!isTerminal && (
                            <span style={{ fontSize: '10px', color: '#111111', display: 'block' }}>
                              → {fmtDate(r.expectedReadyDateMax)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#111111', fontStyle: 'italic' }}>Non calculé</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      {isTerminal ? (
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937' }}>{fmtNumber(actualPlants)}</span>
                      ) : tauxGermination !== null ? (
                        <span style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                          backgroundColor: tauxGermination >= 70 ? '#E8F5E9' : tauxGermination >= 40 ? '#FFF8E1' : '#FFEBEE',
                          color: tauxGermination >= 70 ? '#008030' : tauxGermination >= 40 ? '#8D6E00' : '#B02020',
                        }}>
                          Est. {Math.round((r.quantite * tauxGermination) / 100)} plants
                        </span>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#111111' }}>En attente</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {r.lotSemenceParent ? (
                        <span style={{ fontSize: '13px', fontFamily: 'monospace', color: '#111111', fontWeight: 600 }}>
                          {r.lotSemenceParent.code}
                        </span>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#111111' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                        backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap',
                      }}>
                        {(() => {
                          switch(cfg.icon) {
                            case 'en_cours': return <Sprout size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />;
                            case 'pret': return <CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />;
                            case 'recolte': return <Wheat size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />;
                            case 'livre': return <Truck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />;
                            default: return null;
                          }
                        })()} {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <Link
                        to={`/lots/${r._id}`}
                        style={{
                          padding: '8px 14px', backgroundColor: '#008030', color: 'white',
                          borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                          textDecoration: 'none', cursor: 'pointer',
                        }}
                      >
                        Détails
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '80px 40px', textAlign: 'center', color: '#222222', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9' }}>
          <p style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
            {searchTerm || pepFilter !== 'all' || varFilter !== 'all' || statusFilter !== 'all'
              ? 'Aucun résultat trouvé.'
              : 'Aucune production enregistrée pour le moment.'}
          </p>
          <p style={{ fontSize: '16px', marginTop: '8px' }}>
            {searchTerm || pepFilter !== 'all' || varFilter !== 'all' || statusFilter !== 'all'
              ? 'Essayez une autre recherche.'
              : 'Créez un lot de production pour commencer le suivi.'}
          </p>
        </div>
      )}

      {/* ═══ Production Records Table (auto-saved on delivery) ═══ */}
      <div style={{ marginTop: '40px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <ClipboardList size={22} color="#006625" />
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#222222', margin: 0 }}>
            Registre de production
          </h2>
          <span style={{
            padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
            backgroundColor: '#E8F5E9', color: '#008030',
          }}>
            {filteredProdRecords.length} enregistrement{filteredProdRecords.length !== 1 ? 's' : ''}
            {productionRecords.length > 0 && productionRecords.length !== filteredProdRecords.length && (
              <span> / {productionRecords.length} total</span>
            )}
          </span>
          {productionRecords.length > 0 && (
            <ExportButton
              user={user}
              filename="registre-production"
              columns={[
                { accessor: 'code', header: 'Code' },
                { accessor: 'pepiniere', header: 'Pépinière' },
                { accessor: 'semisCode', header: 'Semis' },
                { accessor: 'variete', header: 'Variété' },
                { accessor: 'quantitePlantee', header: 'Planté' },
                { accessor: 'quantiteProduite', header: 'Produit' },
                { accessor: 'quantiteLivree', header: 'Livré' },
                { accessor: 'dateLivraison', header: 'Date livraison' },
              ]}
              data={filteredProdRecords}
              mapRow={(r) => [
                r.code || '-',
                r.pepiniere || '-',
                r.semisCode || '-',
                r.variete || '-',
                r.quantitePlantee?.toString() || '-',
                r.quantiteProduite?.toString() || '-',
                r.quantiteLivree?.toString() || '-',
                r.dateLivraison ? fmtDate(r.dateLivraison) : '-',
              ]}
            />
          )}
          {/* ── Date filters ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginLeft: 'auto', flexWrap: 'wrap',
          }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#222222', whiteSpace: 'nowrap' }}>
              Du :
            </label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              style={{
                padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '8px',
                fontSize: '13px', fontFamily: 'inherit', background: 'white', outline: 'none',
              }}
            />
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#222222', whiteSpace: 'nowrap' }}>
              Au :
            </label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              style={{
                padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '8px',
                fontSize: '13px', fontFamily: 'inherit', background: 'white', outline: 'none',
              }}
            />
            {(dateDebut || dateFin) && (
              <button
                onClick={() => { setDateDebut(''); setDateFin(''); }}
                style={{
                  padding: '4px 10px', background: 'none', border: 'none',
                  color: '#B02020', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                × Effacer
              </button>
            )}
          </div>
        </div>
        <p style={{ fontSize: '14px', color: '#222222', margin: '-8px 0 16px' }}>
          Enregistré automatiquement à chaque livraison — chaque ligne correspond à un lot livré
        </p>

        {recordsLoading ? (
          <Loading />
        ) : filteredProdRecords.length > 0 ? (
          <>
            {/* ── Summary totals ── */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px',
              marginBottom: '20px',
            }}>
              {(() => {
                const totalPlanted = filteredProdRecords.reduce((s, r) => s + (r.quantitePlantee || 0), 0);
                const totalProduced = filteredProdRecords.reduce((s, r) => s + (r.quantiteProduite || 0), 0);
                const totalDelivered = filteredProdRecords.reduce((s, r) => s + (r.quantiteLivree || 0), 0);
                const lotsCount = filteredProdRecords.length;
                // Unique semis
                const semisSet = new Set(filteredProdRecords.map(r => r.semisCode));
                return (
                  <>
                    <div style={{ background: 'white', borderRadius: '10px', padding: '14px 16px', border: '1px solid #C8E6C9' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#222222', marginBottom: '2px', textTransform: 'uppercase' }}>Lots livrés</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#222222' }}>{lotsCount}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '10px', padding: '14px 16px', border: '1px solid #C8E6C9' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#222222', marginBottom: '2px', textTransform: 'uppercase' }}>Semis utilisés</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#006625' }}>{semisSet.size}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '10px', padding: '14px 16px', border: '1px solid #C8E6C9' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#222222', marginBottom: '2px', textTransform: 'uppercase' }}>Total planté</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#111111' }}>{fmtNumber(totalPlanted)}</div>
                    </div>
                    <div style={{ background: '#E8F5E9', borderRadius: '10px', padding: '14px 16px', border: '1px solid #a7f3d0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#006625', marginBottom: '2px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}><Wheat size={14} /> Total produit</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#008030' }}>{fmtNumber(totalProduced)}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '14px 16px', border: '1px solid #a7f3d0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#006625', marginBottom: '2px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}><Truck size={14} /> Total livré</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#006625' }}>{fmtNumber(totalDelivered)}</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* ── Per-semis aggregation ── */}
            {sortedSemisGroups.length > 1 ? (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#111111', margin: '0 0 10px' }}>
                    Production par semis
                  </h4>
                  <div className={classicMode ? 'classic-table' : ''} style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #C8E6C9', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb' }}>
                          <th onClick={() => handleSortGroup('semisCode')} style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}>Semis<SortIconGroup field="semisCode" /></th>
                          <th onClick={() => handleSortGroup('pepiniere')} style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}>Pépinière<SortIconGroup field="pepiniere" /></th>
                          <th onClick={() => handleSortGroup('variete')} style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}>Variété<SortIconGroup field="variete" /></th>
                          <th onClick={() => handleSortGroup('lots')} style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>Lots<SortIconGroup field="lots" /></th>
                          <th onClick={() => handleSortGroup('plante')} style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>Planté<SortIconGroup field="plante" /></th>
                          <th onClick={() => handleSortGroup('produit')} style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>Produit<SortIconGroup field="produit" /></th>
                          <th onClick={() => handleSortGroup('livre')} style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>Livré<SortIconGroup field="livre" /></th>
                          <th onClick={() => handleSortGroup('rendement')} style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>Rendement<SortIconGroup field="rendement" /></th>
                        </tr>
                      </thead>
                      <tbody>                          {sortedSemisGroups.map((s) => {
                          const rendement = s.plante > 0 ? Math.round((s.produit / s.plante) * 100) : null;
                          return (
                            <tr key={s.semisCode} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#006625', fontFamily: 'monospace' }}>{s.semisCode}</span>
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ fontSize: '13px', color: '#111111' }}>{s.pepiniere}</span>
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111111' }}>{s.variete}</span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111111' }}>{s.lots}</span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <span style={{ fontSize: '13px', color: '#111111' }}>{fmtNumber(s.plante)}</span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#008030' }}>{fmtNumber(s.produit)}</span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <span style={{ fontSize: '13px', color: '#006625' }}>{fmtNumber(s.livre)}</span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                {rendement !== null ? (
                                  <span style={{
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700,
                                    backgroundColor: rendement >= 70 ? '#E8F5E9' : rendement >= 40 ? '#FFF8E1' : '#FFEBEE',
                                    color: rendement >= 70 ? '#008030' : rendement >= 40 ? '#8D6E00' : '#B02020',
                                  }}>
                                    {rendement}%
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '12px', color: '#111111' }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

            {/* ── Detail table per lot ── */}
            <div className={classicMode ? 'classic-table table-scroll' : 'table-scroll'} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0fdf4' }}>
                    <th onClick={() => handleSortProd('code')} style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#006625', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #a7f3d0', cursor: 'pointer', userSelect: 'none' }}>Code<SortIconProd field="code" /></th>
                    <th onClick={() => handleSortProd('pepiniere')} style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#006625', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #a7f3d0', cursor: 'pointer', userSelect: 'none' }}>Pépinière<SortIconProd field="pepiniere" /></th>
                    <th onClick={() => handleSortProd('semisCode')} style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#006625', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #a7f3d0', cursor: 'pointer', userSelect: 'none' }}>Semis<SortIconProd field="semisCode" /></th>
                    <th onClick={() => handleSortProd('variete')} style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#006625', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #a7f3d0', cursor: 'pointer', userSelect: 'none' }}>Variété<SortIconProd field="variete" /></th>
                    <th onClick={() => handleSortProd('quantitePlantee')} style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#006625', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #a7f3d0', cursor: 'pointer', userSelect: 'none' }}>Planté<SortIconProd field="quantitePlantee" /></th>
                    <th onClick={() => handleSortProd('quantiteProduite')} style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#006625', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #a7f3d0', cursor: 'pointer', userSelect: 'none' }}>Produit<SortIconProd field="quantiteProduite" /></th>
                    <th onClick={() => handleSortProd('quantiteLivree')} style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#006625', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #a7f3d0', cursor: 'pointer', userSelect: 'none' }}>Livré<SortIconProd field="quantiteLivree" /></th>
                    <th onClick={() => handleSortProd('dateLivraison')} style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#006625', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #a7f3d0', cursor: 'pointer', userSelect: 'none' }}>Date livraison<SortIconProd field="dateLivraison" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProdRecords.map((rec) => (
                    <tr
                      key={rec._id}
                      style={{ borderBottom: '1px solid #e5e7eb', transition: 'background-color 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#006625', fontFamily: 'monospace' }}>{rec.code}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{rec.pepiniere}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '13px', color: '#222222', fontFamily: 'monospace' }}>{rec.semisCode}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111111' }}>{rec.variete}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#111111' }}>{fmtNumber(rec.quantitePlantee)}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#008030' }}>{fmtNumber(rec.quantiteProduite)}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#008030' }}>{fmtNumber(rec.quantiteLivree)}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '13px', color: '#111111' }}>{fmtDate(rec.dateLivraison)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ padding: '60px 40px', textAlign: 'center', color: '#222222', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9' }}>
            <p style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
              {dateDebut || dateFin
                ? 'Aucun résultat pour cette période.'
                : 'Aucun enregistrement de production pour le moment.'}
            </p>
            <p style={{ fontSize: '14px', marginTop: '6px' }}>
              {dateDebut || dateFin
                ? 'Essayez une autre plage de dates.'
                : 'Les productions sont automatiquement enregistrées quand vous livrez un lot.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
