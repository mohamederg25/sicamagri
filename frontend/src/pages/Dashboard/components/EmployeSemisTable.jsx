/**
 * EmployeSemisTable — Semis overview table for employe role
 * 
 * Shows the first 8 semis records with sortable columns and export capability.
 */
import { Link } from 'react-router-dom';
import ExportButton from '../../../components/ExportButton';
import useSort from '../../../hooks/useSort';
import { fmtNumber } from '../../../utils/dates';
import { sectionStyle, sectionTitleStyle } from '../utils/dashboardStyles';

const EmployeSemisTable = ({ semis = [], user, classicMode }) => {
  const slice = semis.slice(0, 8);
  const { sortedData, handleSort, SortIcon } = useSort(slice, { defaultField: 'code' });
  
  const statusLabels = {
    realisee: 'Réalisée',
    en_cours: 'En cours',
    prevue: 'Prévue',
    annulee: 'Annulée',
  };

  const getBadgeClass = (statut) => {
    const map = {
      realisee: 'badge-green',
      en_cours: 'badge-orange',
      prevue: 'badge-blue',
      annulee: 'badge-red',
    };
    return map[statut] || 'badge-gray';
  };

  return (
    <div className={classicMode ? 'classic-table' : ''} style={sectionStyle}>
      <h2 style={sectionTitleStyle}>
         Aperçu des Semis
        {slice.length > 0 && (
          <span style={{ marginLeft: 'auto' }}>
            <ExportButton
              user={user}
              filename="dashboard-semis"
              columns={[
                { accessor: 'code', header: 'Code' },
                { accessor: 'variete.nom', header: 'Variété' },
                { accessor: 'pepiniere.nom', header: 'Pépinière' },
                { accessor: 'quantite', header: 'Quantité' },
                { accessor: 'statut', header: 'Statut' },
              ]}
              data={slice}
              mapRow={(s) => {
                const statusLabel = statusLabels[s.statut] || s.statut || '-';
                return [s.code || '-', s.variete?.nom || '-', s.pepiniere?.nom || '-', s.quantite?.toString() || '-', statusLabel];
              }}
            />
          </span>
        )}
        <Link to="/semis" style={{
          padding: '6px 14px', backgroundColor: '#008030', color: 'white',
          borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
          textDecoration: 'none',
        }}>
          Voir tous →
        </Link>
      </h2>
      {semis.length === 0 ? (
        <div style={{
          background: 'white', borderRadius: '10px', padding: '32px',
          textAlign: 'center', color: '#999', fontSize: '0.9rem',
          boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
        }}>
          Aucun semis trouvé.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="dash-table" aria-label="Aperçu des semis">
            <thead>
              <tr>
                <th scope="col" onClick={() => handleSort('code')} style={{ cursor: 'pointer', userSelect: 'none' }}>Code<SortIcon field="code" /></th>
                <th scope="col" onClick={() => handleSort('variete.nom')} style={{ cursor: 'pointer', userSelect: 'none' }}>Variété<SortIcon field="variete.nom" /></th>
                <th scope="col" onClick={() => handleSort('pepiniere.nom')} style={{ cursor: 'pointer', userSelect: 'none' }}>Pépinière<SortIcon field="pepiniere.nom" /></th>
                <th scope="col" onClick={() => handleSort('quantite')} style={{ cursor: 'pointer', userSelect: 'none' }}>Quantité<SortIcon field="quantite" /></th>
                <th scope="col" onClick={() => handleSort('statut')} style={{ cursor: 'pointer', userSelect: 'none' }}>Statut<SortIcon field="statut" /></th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((s) => {
                if (!s) return null;
                return (
                  <tr key={s._id}>
                    <td><strong style={{ color: '#A02010', fontFamily: 'monospace' }}>{s.code || '—'}</strong></td>
                    <td><strong>{s.variete?.nom || '—'}</strong></td>
                    <td>{s.pepiniere?.nom || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtNumber(s.quantite)}</td>
                    <td><span className={`badge ${getBadgeClass(s.statut)}`}>{statusLabels[s.statut] || '—'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EmployeSemisTable;
