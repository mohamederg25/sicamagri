/**
 * DashboardStatsTable — Per-nursery stock & production stats table
 * 
 * Shows detailed statistics for each nursery with aggregated totals row.
 * Displayed for admin & ingenieur roles on the dashboard.
 */
import { Link } from 'react-router-dom';
import useSort from '../../../hooks/useSort';
import { fmtNumber } from '../../../utils/dates';
import { sectionStyle, sectionTitleStyle } from '../utils/dashboardStyles';

const getTauxColor = (taux) => {
  if (taux >= 80) return '#B02020';
  if (taux >= 50) return '#D97706';
  return '#008030';
};

const getBadgeInfo = (statut) => {
  if (statut === 'actif') return { class: 'badge-green', label: 'Actif' };
  if (statut === 'inactif') return { class: 'badge-gray', label: 'Inactif' };
  return { class: 'badge-gray', label: statut || '—' };
};

const DashboardStatsTable = ({ stats, classicMode }) => {
  const { sortedData, handleSort, SortIcon } = useSort(stats || [], { defaultField: 'code' });
  if (!stats || stats.length === 0) return null;

  const totals = stats.reduce(
    (acc, p) => ({
      recu: acc.recu + p.semisRecu,
      utilise: acc.utilise + p.semisUtilise,
      dispo: acc.dispo + p.semisDisponible,
      lotsProd: acc.lotsProd + p.lotsProd,
      plantsProduits: acc.plantsProduits + p.plantsProduits,
      plantsLivres: acc.plantsLivres + p.plantsLivres,
    }),
    { recu: 0, utilise: 0, dispo: 0, lotsProd: 0, plantsProduits: 0, plantsLivres: 0 }
  );

  const totalTaux = totals.recu > 0 ? Math.round((totals.utilise / totals.recu) * 100) : 0;

  return (
    <div className={classicMode ? 'classic-table' : ''} style={sectionStyle}>
      <h2 style={sectionTitleStyle}>
         Pépinières — Statistiques
        <Link to="/pepinieres" style={{
          marginLeft: 'auto', fontSize: '0.78rem', color: '#008030',
          textDecoration: 'none', fontWeight: 600,
        }}>
          Voir toutes →
        </Link>
      </h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="dash-table" aria-label="Statistiques par pépinière">
          <thead>
            <tr>
              <th scope="col" onClick={() => handleSort('nom')} style={{ cursor: 'pointer', userSelect: 'none' }}>Pépinière<SortIcon field="nom" /></th>
              <th scope="col" onClick={() => handleSort('code')} style={{ cursor: 'pointer', userSelect: 'none' }}>Code<SortIcon field="code" /></th>
              <th scope="col" onClick={() => handleSort('statut')} style={{ cursor: 'pointer', userSelect: 'none' }}>Statut<SortIcon field="statut" /></th>
              <th scope="col" onClick={() => handleSort('semisRecu')} style={{ cursor: 'pointer', userSelect: 'none' }}>Semis Reçus<SortIcon field="semisRecu" /></th>
              <th scope="col" onClick={() => handleSort('semisUtilise')} style={{ cursor: 'pointer', userSelect: 'none' }}>Utilisés<SortIcon field="semisUtilise" /></th>
              <th scope="col" onClick={() => handleSort('semisDisponible')} style={{ cursor: 'pointer', userSelect: 'none' }}>Disponibles<SortIcon field="semisDisponible" /></th>
              <th scope="col" style={{ cursor: 'pointer', userSelect: 'none' }}>Taux Util.</th>
              <th scope="col" onClick={() => handleSort('lotsProd')} style={{ cursor: 'pointer', userSelect: 'none' }}>Lots Prod.<SortIcon field="lotsProd" /></th>
              <th scope="col" onClick={() => handleSort('plantsProduits')} style={{ cursor: 'pointer', userSelect: 'none' }}>Plants Produits<SortIcon field="plantsProduits" /></th>
              <th scope="col" onClick={() => handleSort('plantsLivres')} style={{ cursor: 'pointer', userSelect: 'none' }}>Plants Livrés<SortIcon field="plantsLivres" /></th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((p, idx) => {
              if (!p) return null;
              const taux = p.semisRecu > 0 ? Math.round((p.semisUtilise / p.semisRecu) * 100) : 0;
              const badge = getBadgeInfo(p.statut);
              return (
                <tr key={p._id || idx}>
                  <td><Link to={`/pepinieres/${p._id}`} style={{ fontWeight: 600, color: '#A02010', textDecoration: 'none' }}>{p.nom || '—'}</Link></td>
                  <td style={{ fontFamily: 'monospace', color: '#555' }}>{p.code || '—'}</td>
                  <td><span className={`badge ${badge.class}`}>{badge.label}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtNumber(p.semisRecu)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtNumber(p.semisUtilise)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: p.semisDisponible === 0 ? '#B02020' : '#008030' }}>{fmtNumber(p.semisDisponible)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: getTauxColor(taux) }}>{taux}%</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.lotsProd}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtNumber(p.plantsProduits)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtNumber(p.plantsLivres)}</td>
                </tr>
              );
            })}
            {/* Totals row */}
            <tr style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #d1d5db' }}>
              <td style={{ fontWeight: 700, color: '#222' }}>Totaux</td>
              <td></td>
              <td></td>
              <td style={{ textAlign: 'right', fontWeight: 800, color: '#222' }}>{fmtNumber(totals.recu)}</td>
              <td style={{ textAlign: 'right', fontWeight: 800, color: '#222' }}>{fmtNumber(totals.utilise)}</td>
              <td style={{ textAlign: 'right', fontWeight: 800, color: totals.dispo === 0 ? '#B02020' : '#008030' }}>{fmtNumber(totals.dispo)}</td>
              <td style={{ textAlign: 'right', fontWeight: 800, color: totalTaux >= 80 ? '#B02020' : '#222' }}>{totalTaux}%</td>
              <td style={{ textAlign: 'right', fontWeight: 800, color: '#222' }}>{totals.lotsProd}</td>
              <td style={{ textAlign: 'right', fontWeight: 800, color: '#222' }}>{fmtNumber(totals.plantsProduits)}</td>
              <td style={{ textAlign: 'right', fontWeight: 800, color: '#222' }}>{fmtNumber(totals.plantsLivres)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardStatsTable;
