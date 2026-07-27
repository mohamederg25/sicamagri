/**
 * Dashboard — Main dashboard page
 * 
 * Displays a role-based overview with pipeline, KPIs, alerts, charts, and stats tables.
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import WorkflowView from '../../components/WorkflowView';
import { GerminationRateChart, LotsStatusChart, ProductionVolumeChart } from '../../components/charts/DashboardCharts';
import ComparatifLivraison from '../../components/charts/ComparatifLivraison';
import AlertCard from '../../components/common/AlertCard';
import { AdminKpis, IngenieurKpis, EmployeKpis, VisiteurKpis } from './components/DashboardKpis';
import DashboardStatsTable from './components/DashboardStatsTable';
import { VisiteurPepinieresOverview, VisiteurVarietesOverview } from './components/VisiteurSections';
import EmployeSemisTable from './components/EmployeSemisTable';
import useDashboardAlerts from './hooks/useDashboardAlerts';
import useDashboardSupervision from './hooks/useDashboardSupervision';
import useWebSocket from '../../hooks/useWebSocket';
import { AlertTriangle, Shield, AlertCircle } from 'lucide-react';

/* 
   MAIN DASHBOARD COMPONENT
    */
const Dashboard = () => {
  const { user, appData, dataLoading, fetchAppData, classicMode } = useAuth();
  const role = user?.role || 'visiteur';
  const [data, setData] = useState(appData);
  const [loading, setLoading] = useState(dataLoading);
  const [error, setError] = useState(null);
  const [pepFilter, setPepFilter] = useState('all');
  const [varFilter, setVarFilter] = useState('all');
  const [showAlerts, setShowAlerts] = useState(false);
  const [newAnomalyAlert, setNewAnomalyAlert] = useState(null);

  // ── WebSocket for real-time notifications ──
  const { lastNotification } = useWebSocket();

  // ── Supervision (semis anomalies) data ──
  const { supervisionLoading } = useDashboardSupervision(lastNotification);

  // ── Dismissed alerts (persisted in localStorage) ──
  const {
    activeFilteredAlerts,
    dismissedAlerts,
    handleDismissAlert,
    handleRestoreDismissed,
  } = useDashboardAlerts(data);

  // ── Flash alert for new anomalies or stock events ──
  useEffect(() => {
    if (lastNotification) {
      if (lastNotification.anomalies?.length > 0) {
        setNewAnomalyAlert({
          count: lastNotification.count,
          timestamp: Date.now(),
        });
      }
      if (lastNotification.type === 'stock:ended') {
        setNewAnomalyAlert({
          count: 1,
          message: `Stock ${lastNotification.code} épuisé — ${lastNotification.quantiteInitiale} graines entièrement consommées`,
          timestamp: Date.now(),
        });
      }
      const timer = setTimeout(() => setNewAnomalyAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastNotification]);

  useEffect(() => {
    setData(appData);
    setLoading(dataLoading);
  }, [appData, dataLoading]);

  const handleRefresh = async () => {
    try {
      await fetchAppData();
      setError(null);
    } catch {
      setError('Impossible de rafraîchir les données.');
    }
  };

  // ── Derived stats ──
  const stats = useMemo(() => {
    if (!data) return null;
    try {
      const peps = data.pepinieres || [];
      const vars = data.varietes || [];
      const lots = data.lots || [];
      const semis = data.semis || [];
      const stockList = data.stock || [];
      const fournisseurs = data.fournisseurs || [];

      const filteredLots = lots.filter((l) => {
        if (!l) return false;
        const pepId = l.semis?.pepiniere?._id || l.semis?.pepiniere;
        const varId = l.semis?.variete?._id || l.semis?.variete;
        return (pepFilter === 'all' || String(pepId) === pepFilter) &&
               (varFilter === 'all' || String(varId) === varFilter);
      });

      const filteredSemis = semis.filter((s) => {
        if (!s) return false;
        const pepId = s.pepiniere?._id || s.pepiniere;
        const varId = s.variete?._id || s.variete;
        return (pepFilter === 'all' || String(pepId) === pepFilter) &&
               (varFilter === 'all' || String(varId) === varFilter);
      });

      const semisActifs = filteredSemis.filter(s => s && (s.statut === 'prevue' || s.statut === 'en_cours'));
      const semisPrevus = filteredSemis.filter(s => s && s.statut === 'prevue').length;
      const semisRealises = filteredSemis.filter(s => s && s.statut === 'realisee').length;

      const germinationRates = filteredLots
        .map((lot) => {
          if (!lot) return null;
          if (lot.tests?.[0]?.grainesTestes > 0) return (lot.tests[0].grainesGermees / lot.tests[0].grainesTestes) * 100;
          if (lot.tauxManuel != null) return lot.tauxManuel;
          return null;
        })
        .filter(r => r !== null);

      const avgGermination = germinationRates.length > 0
        ? germinationRates.reduce((a, b) => a + b, 0) / germinationRates.length
        : null;

      const lotsAvecTaux = germinationRates.length;
      const lotsProd = filteredLots.filter(l => l && l.type === 'production').length;

      let totalRecu = 0;
      let totalUtilise = 0;
      semis.forEach(s => { if (s) totalRecu += s.quantite || 0; });
      lots.forEach(l => { if (l && l.type === 'production') totalUtilise += l.quantite || 0; });
      const tauxUtilisationGlobal = totalRecu > 0 ? Math.round((totalUtilise / totalRecu) * 100) : null;

      const pepActives = peps.filter(p => p && p.statut === 'actif').length;
      const varActives = vars.filter(v => v && v.statut === 'active').length;
      const totalStockEntries = stockList.filter(s => s).length;
      const stockInitial = stockList.reduce((sum, s) => sum + (s.quantiteInitiale || 0), 0);
      const stockRestant = stockList.reduce((sum, s) => sum + (s.quantiteRestante || 0), 0);
      const stockUtilise = stockInitial - stockRestant;
      const rawUtil = stockInitial > 0 ? Math.round((stockUtilise / stockInitial) * 100) : null;
      const stockUtilisation = rawUtil !== null ? Math.max(0, Math.min(100, rawUtil)) : null;

      return {
        totalPepinieres: peps.length,
        totalVarietes: vars.length,
        totalFournisseurs: fournisseurs.length,
        totalLots: filteredLots.length,
        totalSemis: semis.length,
        semisActifs: semisActifs.length,
        semisPrevus, semisRealises,
        lotsProd, lotsTest: 0, lotsAvecTaux,
        avgGermination,
        pepActives, varActives,
        tauxUtilisationGlobal,
        totalStockEntries, stockInitial, stockRestant, stockUtilise, stockUtilisation,
      };
    } catch (err) {
      console.error('Dashboard stats error:', err);
      return null;
    }
  }, [data, pepFilter, varFilter]);

  // ── Pepiniere stats table data ──
  const pepiniereStats = useMemo(() => {
    if (!data) return [];
    return (data.pepinieres || []).filter(p => p).map((pep) => {
      const pepSemis = (data.semis || []).filter(s => s && String(s.pepiniere?._id || s.pepiniere) === String(pep._id));
      const semisRecu = pepSemis.reduce((sum, s) => sum + (s.quantite || 0), 0);
      const semisUtilise = pepSemis.reduce((sum, s) => sum + (s.quantiteUtilisee || 0), 0);
      const semisDisponible = pepSemis.reduce((sum, s) => sum + (s.disponible || 0), 0);
      const pepLots = (data.lots || []).filter(l => l && String(l.semis?.pepiniere?._id || l.semis?.pepiniere) === String(pep._id));
      const prodLots = pepLots.filter(l => l.type === 'production');
      const plantsProduits = prodLots.reduce((sum, l) => sum + (l.nombrePlantsProduits || 0), 0);
      const plantsLivres = prodLots.filter(l => l.statut === 'livre').reduce((sum, l) => sum + (l.nombrePlantsProduits || 0), 0);
      return { ...pep, semisRecu, semisUtilise, semisDisponible, lotsProd: prodLots.length, plantsProduits, plantsLivres };
    });
  }, [data]);

  // ── Render helpers ──
  if (loading && !data) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#999', fontSize: '1.1rem' }}>
        <div style={{ marginBottom: '12px' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#008030" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round" />
          </svg>
        </div>
        Chargement du tableau de bord...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#B02020', fontSize: '1.1rem' }}>
        <div style={{ marginBottom: '12px', fontWeight: 700 }}>Erreur</div>
        <div>{error}</div>
        <button onClick={handleRefresh} style={{
          marginTop: '16px', padding: '8px 24px', backgroundColor: '#B02020',
          color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
          fontSize: '0.9rem', fontWeight: 600,
        }}>
          Réessayer
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#999', fontSize: '1.1rem' }}>
        Aucune donnée disponible.
      </div>
    );
  }

  return (
    <div>
      {/* ── Flash Alert ── */}
      {newAnomalyAlert && (
        <div style={{
          margin: '12px 28px 0', padding: '10px 18px', borderRadius: '8px',
          fontSize: '0.84rem', backgroundColor: '#FFE2E5',
          border: '1px solid #F64E60', color: '#C0392B',
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'slideDown 0.3s ease-out',
        }}>
          <AlertTriangle size={20} />
          <span>
            {newAnomalyAlert.message ||
              `${newAnomalyAlert.count} nouvelle(s) anomalie(s) détectée(s) dans les semis`}
          </span>
        </div>
      )}

      {/* ── PIPELINE DE PRODUCTION ── */}
      {stats && <WorkflowView stats={stats} role={role} />}

      {/* ── ROLE-BASED KPIs ── */}
      {role === 'admin' && <AdminKpis s={stats} />}
      {role === 'ingenieur' && <IngenieurKpis s={stats} />}
      {role === 'employe' && <EmployeKpis s={stats} />}
      {role === 'visiteur' && <VisiteurKpis s={stats} />}

      {/* ── FILTER ROW (admin only) ── */}
      {role === 'admin' && (data?.pepinieres?.length > 0 || data?.varietes?.length > 0) && (
        <div style={{ display: 'flex', gap: '10px', padding: '0 28px', marginTop: '4px', marginBottom: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
          {data?.pepinieres?.length > 0 && (
            <select value={pepFilter} onChange={(e) => setPepFilter(e.target.value)}
              aria-label="Filtrer par pépinière"
              style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.82rem', background: 'white', cursor: 'pointer' }}>
              <option value="all">Toutes les pépinières</option>
              {data.pepinieres.filter(p => p).map((p) => (
                <option key={p._id} value={p._id}>{p.nom}</option>
              ))}
            </select>
          )}
          {data?.varietes?.length > 0 && (
            <select value={varFilter} onChange={(e) => setVarFilter(e.target.value)}
              aria-label="Filtrer par variété"
              style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.82rem', background: 'white', cursor: 'pointer' }}>
              <option value="all">Toutes les variétés</option>
              {data.varietes.filter(v => v).map((v) => (
                <option key={v._id} value={v._id}>{v.nom}</option>
              ))}
            </select>
          )}
          <button onClick={handleRefresh} style={{
            marginLeft: 'auto', padding: '7px 16px', borderRadius: '8px',
            border: '1px solid #d1d5db', background: 'white', cursor: 'pointer',
            fontSize: '0.82rem', fontWeight: 600, color: '#444',
          }}>
            Actualiser
          </button>
        </div>
      )}

      {/* ── ALERTS SECTION ── */}
      {(role === 'admin' || role === 'ingenieur') && (
        <div style={{ padding: '8px 28px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{
              fontSize: '0.95rem', fontWeight: 700, color: '#333', margin: 0,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <Shield size={18} />
              Alertes & Surveillance
              {activeFilteredAlerts.length > 0 && (
                <span style={{
                  background: '#B02020', color: 'white', borderRadius: '50%',
                  padding: '0 7px', fontSize: '0.7rem', fontWeight: 700,
                  lineHeight: '18px', minWidth: '18px', textAlign: 'center',
                }}>
                  {activeFilteredAlerts.length}
                </span>
              )}
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {dismissedAlerts.size > 0 && (
                <button onClick={handleRestoreDismissed} style={{
                  padding: '4px 12px', borderRadius: '6px',
                  border: '1px solid #d1d5db', background: 'white',
                  cursor: 'pointer', fontSize: '0.75rem', color: '#666',
                }}>
                  Restaurer alertes masquées
                </button>
              )}
              <button onClick={() => setShowAlerts(!showAlerts)} style={{
                padding: '4px 12px', borderRadius: '6px',
                border: '1px solid #d1d5db', background: 'white',
                cursor: 'pointer', fontSize: '0.75rem', color: '#666',
              }}>
                {showAlerts ? 'Masquer' : 'Voir tout'}
              </button>
            </div>
          </div>
          {showAlerts && (
            <AlertCard
              icon={<AlertCircle size={16} />}
              title="Toutes les alertes"
              items={activeFilteredAlerts}
              emptyMsg="Aucune alerte pour le moment"
              onDismiss={handleDismissAlert}
            />
          )}
        </div>
      )}

      {/* ── CHARTS SECTION ── */}
      {(role === 'admin' || role === 'ingenieur') && (
        <div style={{ padding: '8px 28px 16px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#333', marginBottom: '12px', paddingTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             Analyses & Statistiques
            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#888', fontWeight: 500 }}>
              {lastNotification ? 'Temps réel actif' : 'Données chargées'}
            </span>
          </h2>
          <ComparatifLivraison lots={data?.lots || []} pepinieres={data?.pepinieres || []} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <GerminationRateChart lots={data?.lots || []} />
            <LotsStatusChart lots={data?.lots || []} />
            <ProductionVolumeChart lots={data?.lots || []} />
          </div>
        </div>
      )}

      {/* ── PÉPINIÈRE STATS TABLE ── */}
      {(role === 'admin' || role === 'ingenieur') && (
        <DashboardStatsTable stats={pepiniereStats} classicMode={classicMode} />
      )}

      {/* ── EMPLOYE SEMIS TABLE ── */}
      {role === 'employe' && (
        <EmployeSemisTable semis={data?.semis || []} user={user} classicMode={classicMode} />
      )}

      {/* ── VISITEUR SECTIONS ── */}
      {role === 'visiteur' && (
        <>
          <VisiteurPepinieresOverview
            pepinieres={data?.pepinieres || []}
            semis={data?.semis || []}
            lots={data?.lots || []}
          />
          <VisiteurVarietesOverview varietes={data?.varietes || []} />
        </>
      )}
    </div>
  );
};

export default Dashboard;
