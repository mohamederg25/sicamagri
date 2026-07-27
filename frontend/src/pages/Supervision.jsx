/**
 * Supervision — Semis Statistics & Anomaly Detection
 * ====================================================
 *
 * Displays:
 *   - Summary stats (total semis, % with anomalies, etc.)
 *   - Anomaly cards (color-coded by severity)
 *   - Full table of all semis with anomaly status
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import { Search, AlertTriangle, AlertCircle, Info, CheckCircle, Shield } from 'lucide-react';
import useSort from '../hooks/useSort';
import semisService from '../services/semisService';

/* ── Severity config ── */
const SEVERITY = {
  critical: { label: 'Critique', color: '#991b1b', bg: '#fef2f2', border: '#fecaca', icon: AlertCircle },
  warning:  { label: 'Attention', color: '#92400e', bg: '#fffbeb', border: '#fde68a', icon: AlertTriangle },
  info:     { label: 'Info', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', icon: Info },
};

/* ── Trend arrow ── */
const TrendBadge = ({ direction, pct }) => {
  if (!direction || direction === 'stable') return null;
  const isUp = direction === 'up';
  const isDown = direction === 'down';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '2px',
      marginLeft: '8px',
      fontSize: '12px',
      fontWeight: 700,
      color: isUp ? '#008030' : isDown ? '#dc2626' : '#6b7280',
      backgroundColor: isUp ? '#f0fdf4' : isDown ? '#fef2f2' : '#f3f4f6',
      padding: '2px 8px',
      borderRadius: '4px',
      border: `1px solid ${isUp ? '#bbf7d0' : isDown ? '#fecaca' : '#e5e7eb'}`,
    }}>
      {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{pct}%
    </span>
  );
};

/* ── Quick stat card ── */
const StatCard = ({ label, value, color, bg, border, icon, trend }) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    padding: '18px 20px',
    border: border || `1px solid ${bg || '#C8E6C9'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }}>
    <div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
        {label}
        {trend && <TrendBadge direction={trend.direction} pct={trend.pct} />}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: color || '#222222' }}>
        {value}
      </div>
    </div>
    {icon && (
      <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: bg || '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
    )}
  </div>
);

/* ── Anomaly Card ── */
const AnomalyCard = ({ semisCode, variete, pepiniere, anomalies, severityScore }) => {
  // Group by highest severity
  const topSeverity = anomalies.reduce((max, a) => {
    const order = { critical: 3, warning: 2, info: 1 };
    return (order[a.severity] || 0) > (order[max] || 0) ? a.severity : max;
  }, 'info');
  const cfg = SEVERITY[topSeverity];
  const Icon = cfg.icon;

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: `1px solid ${cfg.border}`,
      overflow: 'hidden',
      transition: 'all 0.2s ease',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Severity header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        backgroundColor: cfg.bg,
        borderBottom: `1px solid ${cfg.border}`,
      }}>
        <Icon size={16} color={cfg.color} />
        <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {cfg.label}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', color: cfg.color }}>
          {semisCode || '-'}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#222222', marginBottom: '4px' }}>
          {variete?.nom || '—'} · {pepiniere?.nom || '—'}
        </div>
        <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {anomalies.map((a, i) => {
            const sev = SEVERITY[a.severity];
            return (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '13px', color: '#222222' }}>
                <span style={{ flexShrink: 0, marginTop: '2px' }}>
                  {a.severity === 'critical' ? '🔴' : a.severity === 'warning' ? '🟡' : '🔵'}
                </span>
                <span>{a.message}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

const Supervision = () => {
  const { user, classicMode } = useAuth();
  const [data, setData] = useState([]);
  const [trends, setTrends] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const { data: resData } = await semisService.getSupervision();
        // Handle both formats: array (old) or { results, trends } (new)
        if (Array.isArray(resData)) {
          setData(resData);
          setTrends({});
        } else {
          setData(resData.results || []);
          setTrends(resData.trends || {});
        }
      } catch (err) {
        console.error(err);
        setError('Impossible de charger les données de supervision.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Derived stats
  const totalSemis = data.length;
  const withAnomalies = data.filter((s) => s.hasAnomalies);
  const criticalCount = data.filter((s) => s.anomalies.some((a) => a.severity === 'critical')).length;
  const totalActiveProduction = data.reduce((sum, s) => sum + s.activeLotsCount, 0);
  const totalPlantsProduced = data.reduce((sum, s) => sum + (s.totalPlantsProduced || 0), 0);

  // Filter anomalies
  const anomalySemis = data.filter((s) => s.hasAnomalies);
  const filteredAnomalies = anomalySemis.filter((s) => {
    if (filterSeverity !== 'all') {
      return s.anomalies.some((a) => a.severity === filterSeverity);
    }
    return true;
  });

  const { sortedData, handleSort, SortIcon } = useSort(data, { defaultField: 'code' });

  if (loading) return <Loading />;

  const allSeverities = ['all', 'critical', 'warning', 'info'];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
        <Shield size={32} color="#B02020" />
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#222222', margin: 0 }}>
          Supervision
        </h1>
      </div>
      <p style={{ fontSize: '18px', color: '#222222', marginLeft: '44px', marginBottom: '24px' }}>
        Surveillance des semis — détection des anomalies et alertes
      </p>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* ═══ Summary Stats ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '28px',
      }}>
        <StatCard
          label="Total Semis"
          value={totalSemis}
          color="#222222"
          bg="#f0fdf4"
          icon={<CheckCircle size={22} color="#008030" />}
          trend={trends.semis}
        />
        <StatCard
          label="Avec anomalies"
          value={withAnomalies.length}
          color={withAnomalies.length > 0 ? '#92400e' : '#008030'}
          bg={withAnomalies.length > 0 ? '#fffbeb' : '#f0fdf4'}
          border={withAnomalies.length > 0 ? '#fde68a' : '#bbf7d0'}
          icon={<AlertTriangle size={22} color={withAnomalies.length > 0 ? '#d97706' : '#008030'} />}
          trend={trends.anomalies}
        />
        <StatCard
          label="Alertes critiques"
          value={criticalCount}
          color={criticalCount > 0 ? '#991b1b' : '#008030'}
          bg={criticalCount > 0 ? '#fef2f2' : '#f0fdf4'}
          border={criticalCount > 0 ? '#fecaca' : '#bbf7d0'}
          icon={<AlertCircle size={22} color={criticalCount > 0 ? '#dc2626' : '#008030'} />}
          trend={trends.anomalies}
        />
        <StatCard
          label="Lots actifs"
          value={totalActiveProduction}
          color="#1e40af"
          bg="#eff6ff"
          border="#bfdbfe"
          icon={<Info size={22} color="#2563eb" />}
          trend={trends.lots}
        />
        <StatCard
          label="Plants produits"
          value={totalPlantsProduced.toLocaleString('fr-FR')}
          color="#006625"
          bg="#f0fdf4"
          border="#bbf7d0"
          icon={<CheckCircle size={22} color="#008030" />}
          trend={trends.plantsProduits}
        />
      </div>

      {/* ═══ Anomalies Section ═══ */}
      {filteredAnomalies.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#222222', margin: 0 }}>
              Alertes et anomalies
              <span style={{ marginLeft: '10px', fontSize: '14px', fontWeight: 600, color: '#222222' }}>
                ({filteredAnomalies.length})
              </span>
            </h2>

            {/* Severity filter pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {allSeverities.map((sev) => {
                const isActive = filterSeverity === sev;
                const cfg = sev === 'all' ? { label: 'Tous', color: '#111111', bg: '#f3f4f6', border: '#d1d5db' } : SEVERITY[sev];
                return (
                  <button
                    key={sev}
                    onClick={() => setFilterSeverity(sev)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${isActive ? cfg.color : cfg.border || '#d1d5db'}`,
                      backgroundColor: isActive ? cfg.bg : 'white',
                      color: isActive ? cfg.color : '#6b7280',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {sev === 'all' ? 'Tous' : cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Anomaly cards grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '12px',
            marginBottom: '32px',
          }}>
            {filteredAnomalies.map((s) => (
              <AnomalyCard
                key={s._id}
                semisCode={s.code}
                variete={s.variete}
                pepiniere={s.pepiniere}
                anomalies={s.anomalies}
                severityScore={s.severityScore}
              />
            ))}
          </div>
        </>
      )}

      {/* No anomalies */}
      {data.length > 0 && filteredAnomalies.length === 0 && (
        <div style={{
          padding: '48px 40px',
          textAlign: 'center',
          backgroundColor: '#f0fdf4',
          borderRadius: '12px',
          border: '1px solid #bbf7d0',
          marginBottom: '32px',
        }}>
          <CheckCircle size={48} color="#008030" style={{ marginBottom: '12px' }} />
          <p style={{ fontSize: '18px', fontWeight: 600, color: '#006625', margin: 0 }}>
            Aucune anomalie détectée
          </p>
          <p style={{ fontSize: '14px', color: '#222222', marginTop: '6px' }}>
            {filterSeverity !== 'all' ? 'Aucune alerte pour le filtre sélectionné.' : 'Tous les semis sont en ordre.'}
          </p>
        </div>
      )}

      {/* ═══ Search + Full table ═══ */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={20} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#111111' }} />
          <input
            type="text"
            placeholder="Rechercher par code, variété ou pépinière..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 18px 12px 46px',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#222222', whiteSpace: 'nowrap' }}>
          {sortedData.filter((s) => {
            if (!searchTerm.trim()) return true;
            const q = searchTerm.toLowerCase();
            return (s.code || '').toLowerCase().includes(q) ||
              (s.variete?.nom || '').toLowerCase().includes(q) ||
              (s.pepiniere?.nom || '').toLowerCase().includes(q);
          }).length} semis
        </div>
      </div>

      {/* ═══ Full Table ═══ */}
      <div className={classicMode ? 'classic-table' : ''} style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr>
              <th onClick={() => handleSort('code')} style={{ cursor: 'pointer', userSelect: 'none' }}>Code<SortIcon field="code" /></th>
              <th onClick={() => handleSort('variete.nom')} style={{ cursor: 'pointer', userSelect: 'none' }}>Variété<SortIcon field="variete.nom" /></th>
              <th onClick={() => handleSort('pepiniere.nom')} style={{ cursor: 'pointer', userSelect: 'none' }}>Pépinière<SortIcon field="pepiniere.nom" /></th>
              <th onClick={() => handleSort('quantite')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>Reçu<SortIcon field="quantite" /></th>
              <th onClick={() => handleSort('tauxUtilisation')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>Utilisé<SortIcon field="tauxUtilisation" /></th>
              <th onClick={() => handleSort('expectedPlants')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>Estimé<SortIcon field="expectedPlants" /></th>
              <th onClick={() => handleSort('totalPlantsProduced')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>Produit<SortIcon field="totalPlantsProduced" /></th>
              <th onClick={() => handleSort('lotsCount')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>Lots<SortIcon field="lotsCount" /></th>
              <th style={{ textAlign: 'center' }}>Anomalies</th>
            </tr>
          </thead>
          <tbody>
            {sortedData
              .filter((s) => {
                if (!searchTerm.trim()) return true;
                const q = searchTerm.toLowerCase();
                return (s.code || '').toLowerCase().includes(q) ||
                  (s.variete?.nom || '').toLowerCase().includes(q) ||
                  (s.pepiniere?.nom || '').toLowerCase().includes(q);
              })
              .map((s) => {
              const hasCritical = s.anomalies.some((a) => a.severity === 'critical');
              const hasWarning = s.anomalies.some((a) => a.severity === 'warning');
              const severityColor = hasCritical ? '#fef2f2' : hasWarning ? '#fffbeb' : s.hasAnomalies ? '#fafafa' : 'transparent';

              return (
                <tr key={s._id}
                  style={{ backgroundColor: severityColor }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = severityColor; }}
                >
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: '#B02020' }}>
                    {s.code || '-'}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', fontWeight: 600, color: '#222222' }}>
                    {s.variete?.nom || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', color: '#111111' }}>
                    {s.pepiniere?.nom || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', fontWeight: 700, textAlign: 'center', color: '#1f2937' }}>
                    {s.quantite || 0}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                    {s.tauxUtilisation != null ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <div style={{ width: '50px', height: '6px', backgroundColor: '#C8E6C9', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, s.tauxUtilisation)}%`,
                            height: '100%',
                            backgroundColor: s.tauxUtilisation >= 80 ? '#B02020' : s.tauxUtilisation >= 50 ? '#d97706' : '#008030',
                          }} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#111111' }}>{s.tauxUtilisation}%</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '13px', color: '#111111' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', fontWeight: 700, textAlign: 'center', color: '#1f2937' }}>
                    {s.expectedPlants != null ? s.expectedPlants.toLocaleString('fr-FR') : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', fontWeight: 700, textAlign: 'center', color: s.totalPlantsProduced > 0 ? '#008030' : '#9ca3af' }}>
                    {s.totalPlantsProduced > 0 ? s.totalPlantsProduced.toLocaleString('fr-FR') : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: s.lotsCount > 0 ? '#dcfce7' : '#f3f4f6',
                      color: s.lotsCount > 0 ? '#006625' : '#9ca3af',
                    }}>
                      {s.lotsCount}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                    {s.hasAnomalies ? (
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {s.anomalies.map((a, i) => {
                          const cfg = SEVERITY[a.severity];
                          return (
                            <span key={i} title={a.message} style={{
                              display: 'inline-block',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: cfg.color,
                            }} />
                          );
                        })}
                      </div>
                    ) : (
                      <CheckCircle size={16} color="#008030" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div style={{ padding: '80px 40px', textAlign: 'center', color: '#222222', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9' }}>
          <Shield size={56} style={{ color: '#d1d5db', marginBottom: '20px' }} />
          <p style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
            Aucun semis trouvé
          </p>
          <p style={{ fontSize: '16px', marginTop: '8px' }}>
            Créez des semis pour voir apparaître les données de supervision.
          </p>
        </div>
      )}
    </div>
  );
};

export default Supervision;
