import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import Loading from '../components/Loading';
import ExportButton from '../components/ExportButton';
import { Search } from 'lucide-react';
import useSort from '../hooks/useSort';
import semisService from '../services/semisService';

const thStyle = {
  padding: '16px 24px',
  textAlign: 'center',
  fontSize: '13px',
  fontWeight: 600,
  color: '#222222',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const Semis = () => {
  const [semisList, setSemisList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pepFilter, setPepFilter] = useState('all');
  const [varFilter, setVarFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const navigate = useNavigate();
  const { user, classicMode } = useAuth();

  const fetchSemis = async () => {
    try {
      setLoading(true);
      const { data } = await semisService.getAllIndividual();
      setSemisList(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemis();
  }, []);

  // ── Derived filter options ──
  const pepinieres = useMemo(
    () => [...new Map(semisList.map((s) => [s.pepiniere?._id, { _id: s.pepiniere?._id, nom: s.pepiniere?.nom }])).values()].filter((p) => p._id),
    [semisList]
  );
  const varietes = useMemo(
    () => [...new Map(semisList.map((s) => [s.variete?._id, { _id: s.variete?._id, nom: s.variete?.nom }])).values()].filter((v) => v._id),
    [semisList]
  );

  const getStockStatus = (s) => {
    if (s.quantiteUtilisee >= s.quantite) return 'epuise';
    if (s.quantiteUtilisee > 0) return 'en_usage';
    return 'disponible';
  };

  const filteredList = semisList.filter(s => {
    const pepMatch = pepFilter === 'all' || (s.pepiniere?._id || s.pepiniere) === pepFilter;
    const varMatch = varFilter === 'all' || (s.variete?._id || s.variete) === varFilter;
    const statusMatch = statusFilter === 'all' || getStockStatus(s) === statusFilter;

    if (!pepMatch || !varMatch || !statusMatch) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (s.variete?.nom || '').toLowerCase().includes(q) ||
      (s.pepiniere?.nom || '').toLowerCase().includes(q) ||
      (s.code || '').toLowerCase().includes(q)
    );
  });

  const { sortedData, handleSort, SortIcon } = useSort(filteredList, { defaultField: 'code' });

  if (loading) return <Loading />;

  const selectStyle = {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    background: 'white',
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#222222', margin: 0 }}>Suivi des Semis</h1>
          <p style={{ fontSize: '18px', color: '#222222', margin: '4px 0 0' }}>Gestion des quantités utilisées et disponibles par variété</p>
        </div>
        <Link
          to="/cycles-de-semis"
          style={{
            padding: '8px 16px',
            backgroundColor: '#f0fdf4',
            color: '#006625',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            border: '1px solid #bbf7d0',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dcfce7'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
        >
          Cycles de semis
        </Link>
      </div>

      <div className={classicMode ? 'classic-table' : ''} style={{
        backgroundColor: 'white',
        border: '1px solid #C8E6C9',
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '24px'
      }}>
        {/* ── Filters bar ── */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#111111' }} />
            <input
              type="text"
              placeholder="Rechercher par code, variété, pépinière..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px 10px 42px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#111111', cursor: 'pointer', fontSize: '16px' }}>×</button>
            )}
          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="all">Tous les stocks</option>
            <option value="disponible"> Disponible</option>
            <option value="en_usage"> En usage</option>
            <option value="epuise">Épuisé</option>
          </select>

          <select value={pepFilter} onChange={(e) => setPepFilter(e.target.value)} style={selectStyle}>
            <option value="all">Toutes pépinières</option>
            {pepinieres.map((p) => (
              <option key={p._id} value={p._id}>{p.nom}</option>
            ))}
          </select>

          <select value={varFilter} onChange={(e) => setVarFilter(e.target.value)} style={selectStyle}>
            <option value="all">Toutes variétés</option>
            {varietes.map((v) => (
              <option key={v._id} value={v._id}>{v.nom}</option>
            ))}
          </select>

<ExportButton
            user={user}
            filename="semis"
            columns={[{ accessor: 'code', header: 'Code' }, { accessor: 'variete.nom', header: 'Variété' }, { accessor: 'type', header: 'Type' }, { accessor: 'motif', header: 'Destination/Motif' }, { accessor: 'quantite', header: 'Quantité' }, { accessor: 'tauxGermination', header: 'Germination' }, { accessor: 'quantiteUtilisee', header: 'Quantité Utilisée' }, { accessor: 'disponible', header: 'Disponible' }, { accessor: 'statut', header: 'Statut' }]}
            data={filteredList}
            mapRow={(s) => {
              const disponible = Math.max(0, (s.quantite || 0) - (s.quantiteUtilisee || 0));
              let statusLabel = 'Disponible';
              if (s.quantiteUtilisee >= s.quantite) {
                statusLabel = 'Épuisé';
              } else if (s.quantiteUtilisee > 0) {
                statusLabel = 'En usage';
              }
              return [
                s.code || '-', 
                s.variete?.nom || '-', 
                s.type === 'externe' ? 'Externe' : 'Pépinière', 
                s.type === 'externe' ? (s.motif || '-') : (s.pepiniere?.nom || '-'),
                s.quantite?.toString() || '-', 
                s.tauxGermination != null ? `${s.tauxGermination}%` : '—',
                s.quantiteUtilisee?.toString() || '0', 
                disponible.toString(), 
                statusLabel
              ];
            }}
          />
          {(user?.role === 'admin' || user?.role === 'employe') && (
            <Link
              to="/semis/new"
              style={{
                padding: '10px 18px',
                backgroundColor: '#008030',
                color: 'white',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              + Nouveau Semis
            </Link>
          )}
          <span style={{ fontSize: '12px', color: '#111111' }}>
            {filteredList.length} semis
          </span>
        </div>

        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table aria-label="Liste des semis" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th scope="col" onClick={() => handleSort('code')} style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}>Code<SortIcon field="code" /></th>
                <th scope="col" onClick={() => handleSort('variete.nom')} style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}>Variété<SortIcon field="variete.nom" /></th>
                <th scope="col" onClick={() => handleSort('quantite')} style={{ ...thStyle, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>Quantité<SortIcon field="quantite" /></th>
                <th scope="col" onClick={() => handleSort('tauxGermination')} style={{ ...thStyle, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>Germination<SortIcon field="tauxGermination" /></th>
                <th scope="col" onClick={() => handleSort('quantiteUtilisee')} style={{ ...thStyle, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>Quantité Utilisée<SortIcon field="quantiteUtilisee" /></th>
                <th scope="col" style={{ ...thStyle, textAlign: 'center' }}>Disponible</th>
                <th scope="col" style={{ ...thStyle, textAlign: 'center' }}>Statut</th>
                <th scope="col" style={{ ...thStyle, textAlign: 'center' }}>Type</th>
                <th scope="col" onClick={() => handleSort('pepiniere.nom')} style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}>Destination<SortIcon field="pepiniere.nom" /></th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? sortedData.map((s) => {
                const disponible = Math.max(0, (s.quantite || 0) - (s.quantiteUtilisee || 0));
              
              let statusLabel = 'Disponible';
              let statusConfig = { bg: '#E8F5E9', color: '#008030', border: '#C8E6C9' };
              
              if (s.quantiteUtilisee >= s.quantite) {
                statusLabel = 'Épuisé';
                statusConfig = { bg: '#FFEBEE', color: '#B02020', border: '#FFCDD2' };
              } else if (s.quantiteUtilisee > 0) {
                statusLabel = 'En usage';
                statusConfig = { bg: '#E3F2FD', color: '#1565C0', border: '#90CAF9' };
              }

                return (
                  <tr
                    key={s._id}
                    style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.15s ease', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                    onClick={() => {
                      if (s._id) {
                        navigate(`/semis/${s._id}`);
                      }
                    }}
                  >
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      <span style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'monospace', color: '#B02020', backgroundColor: '#fef2f2', padding: '6px 16px', borderRadius: '6px', letterSpacing: '0.8px' }}>
                        {s.code || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 600, color: '#222222' }}>
                        {s.variete?.nom || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: '#1f2937' }}>
                        {s.quantite}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      {s.tauxGermination != null ? (
                        <span style={{
                          padding: '5px 14px',
                          borderRadius: '6px',
                          fontSize: '15px',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          backgroundColor: s.tauxGermination >= 70 ? '#E8F5E9' : s.tauxGermination >= 40 ? '#FFF8E1' : '#FFEBEE',
                          color: s.tauxGermination >= 70 ? '#008030' : s.tauxGermination >= 40 ? '#8D6E00' : '#B02020',
                          border: `1px solid ${s.tauxGermination >= 70 ? '#bbf7d0' : s.tauxGermination >= 40 ? '#fde68a' : '#fecaca'}`,
                        }}>
                          {s.tauxGermination}%
                        </span>
                      ) : (
                        <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: 500 }}>
                          —
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: '#B02020' }}>
                        {s.quantiteUtilisee || 0}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      <span style={{ 
                        fontSize: '17px', 
                        fontWeight: 700, 
                        color: disponible > 0 ? '#008030' : '#9ca3af' 
                      }}>
                        {disponible}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      <span style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '15px',
                        fontWeight: 700,
                        backgroundColor: statusConfig.bg,
                        color: statusConfig.color,
                        border: `1px solid ${statusConfig.border}`
                      }}>
                        {statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 700,
                        backgroundColor: s.type === 'externe' ? '#FFFBEB' : '#E8F5E9',
                        color: s.type === 'externe' ? '#D97706' : '#008030',
                        border: `1px solid ${s.type === 'externe' ? '#fde68a' : '#C8E6C9'}`,
                      }}>
                        {s.type === 'externe' ? 'Externe' : 'Pépinière'}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      {s.type === 'externe' ? (
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#111111', fontStyle: 'italic' }}>
                          {s.motif || '—'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '17px', fontWeight: 500, color: '#111111' }}>
                          {s.pepiniere?.nom || '-'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="9" style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', color: '#222222', margin: 0 }}>
                      {searchTerm || pepFilter !== 'all' || varFilter !== 'all' || statusFilter !== 'all'
                        ? 'Aucun semis trouvé avec ces filtres.'
                        : 'Aucune donnée trouvée'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Semis;
