/**
 * TestsGermination — Liste globale des tests de germination
 * ===========================================================
 *
 * Affiche tous les tests de germination réalisés sur l'ensemble
 * des stocks du magazin, avec lien vers le détail du stock.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import ExportButton from '../components/ExportButton';
import stockService from '../services/stockService';
import { Search, FlaskConical, Trash2, ArrowRight, Calendar, Warehouse } from 'lucide-react';

const germStyle = (rate) => {
  if (rate == null) return { bg: '#f3f4f6', color: '#111111' };
  if (rate >= 70) return { bg: '#dcfce7', color: '#006625' };
  if (rate >= 40) return { bg: '#fef3c7', color: '#92400e' };
  return { bg: '#fee2e2', color: '#991b1b' };
};

const TestsGermination = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTests = async () => {
    try {
      setLoading(true);
      const { data } = await stockService.getAllGerminationTests();
      setTests(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleDeleteTest = async (testId, e) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce test de germination ?')) return;
    try {
      await stockService.deleteGerminationTest(testId);
      setTests(prev => prev.filter(t => t._id !== testId));
    } catch (error) {
      alert(error?.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const filteredTests = useMemo(() => {
    if (!searchTerm.trim()) return tests;
    const q = searchTerm.toLowerCase();
    return tests.filter(t => {
      const code = t.stockSemence?.code || '';
      const variete = t.stockSemence?.variete?.nom || '';
      return code.toLowerCase().includes(q) || variete.toLowerCase().includes(q);
    });
  }, [tests, searchTerm]);

  if (loading) return <Loading />;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* ═══ Header ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#222222', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FlaskConical size={32} color="#7c3aed" />
            Tests de germination
          </h1>
          <p style={{ fontSize: '18px', color: '#222222', margin: '4px 0 0' }}>
            Suivi des tests de germination réalisés sur les stocks du magazin
          </p>
        </div>
        <Link
          to="/stock"
          style={{
            padding: '12px 20px',
            backgroundColor: '#7c3aed',
            color: 'white',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#6d28d9'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#7c3aed'}
        >
          <Warehouse size={18} />
          Voir le Stock
        </Link>
      </div>

      {/* ═══ Stats bar ═══ */}
      {tests.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e9d5ff' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tests réalisés</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#7c3aed', marginTop: '2px' }}>{tests.length}</div>
          </div>
          <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '18px 20px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#008030', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Taux ≥ 70%</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#008030', marginTop: '2px' }}>
              {tests.filter(t => t.tauxGermination >= 70).length}
            </div>
          </div>
          <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '18px 20px', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Taux 40-69%</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#92400e', marginTop: '2px' }}>
              {tests.filter(t => t.tauxGermination >= 40 && t.tauxGermination < 70).length}
            </div>
          </div>
          <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '18px 20px', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Taux &lt; 40%</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#991b1b', marginTop: '2px' }}>
              {tests.filter(t => t.tauxGermination < 40).length}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Table ═══ */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e9d5ff', borderRadius: '16px', overflow: 'hidden' }}>
        {/* Filters */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#111111' }} />
            <input
              type="text"
              placeholder="Rechercher par code stock ou variété..."
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
          <span style={{ fontSize: '12px', color: '#111111' }}>
            {filteredTests.length} test{filteredTests.length !== 1 ? 's' : ''}
          </span>

          <ExportButton
            user={user}
            filename="tests-germination"
            columns={[
              { accessor: 'stockSemence.code', header: 'Stock' },
              { accessor: 'stockSemence.variete.nom', header: 'Variété' },
              { accessor: 'dateTest', header: 'Date' },
              { accessor: 'grainesTestees', header: 'Testées' },
              { accessor: 'grainesGermees', header: 'Germées' },
              { accessor: 'tauxGermination', header: 'Taux %' },
              { accessor: 'stockSemence.quantiteRestante', header: 'Restant' },
              { accessor: 'stockSemence.quantiteInitiale', header: 'Initial' },
            ]}
            data={filteredTests}
            mapRow={(t) => {
              const init = t.stockSemence?.quantiteInitiale || 0;
              const rest = t.stockSemence?.quantiteRestante || 0;
              const utilise = init - rest;
              const pct = init > 0 ? Math.round((utilise / init) * 100) : 0;
              return [
                t.stockSemence?.code || '-',
                t.stockSemence?.variete?.nom || '-',
                t.dateTest ? new Date(t.dateTest).toLocaleDateString('fr-FR') : '-',
                String(t.grainesTestees || 0),
                String(t.grainesGermees || 0),
                t.tauxGermination != null ? `${t.tauxGermination}%` : '?',
                String(rest),
                `${utilise} / ${init} (${pct}%)`,
              ];
            }}
          />
        </div>

        {/* Table */}
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th scope="col" style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e9d5ff', textAlign: 'center' }}>Stock</th>
                <th scope="col" style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e9d5ff', textAlign: 'center' }}>Variété</th>
                <th scope="col" style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e9d5ff', textAlign: 'center' }}>Date</th>
                <th scope="col" style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e9d5ff', textAlign: 'center' }}>Testées</th>
                <th scope="col" style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e9d5ff', textAlign: 'center' }}>Germées</th>
                <th scope="col" style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e9d5ff', textAlign: 'center' }}>Taux</th>
                <th scope="col" style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e9d5ff', textAlign: 'center' }}>Restant</th>
                <th scope="col" style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e9d5ff', textAlign: 'center' }}>Consommation</th>
                <th scope="col" style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e9d5ff', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.length > 0 ? filteredTests.map((test) => {
                const taux = test.tauxGermination;
                const style = germStyle(taux);
                const stockId = test.stockSemence?._id;
                return (
                  <tr
                    key={test._id}
                    style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.15s ease', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                    onClick={() => stockId && navigate(`/stock/${stockId}`)}
                  >
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'monospace', color: '#7c3aed', backgroundColor: '#f3e8ff', padding: '4px 12px', borderRadius: '6px', letterSpacing: '0.8px' }}>
                        {test.stockSemence?.code || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>
                        {test.stockSemence?.variete?.nom || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{ fontSize: '14px', color: '#111111', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        <Calendar size={14} color="#111111" />
                        {test.dateTest ? new Date(test.dateTest).toLocaleDateString('fr-FR') : '-'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937' }}>{test.grainesTestees}</span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937' }}>{test.grainesGermees}</span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{
                        padding: '6px 14px', borderRadius: '6px', fontSize: '15px', fontWeight: 700,
                        backgroundColor: style.bg, color: style.color, display: 'inline-block',
                      }}>
                        {taux != null ? `${taux}%` : '?'}
                      </span>
                    </td>
                    {/* ── Stock restant ── */}
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: (test.stockSemence?.quantiteRestante || 0) > 0 ? '#008030' : '#9ca3af' }}>
                        {test.stockSemence?.quantiteRestante?.toLocaleString() || '0'}
                      </span>
                    </td>
                    {/* ── Consommation ── */}
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      {(() => {
                        const init = test.stockSemence?.quantiteInitiale || 0;
                        const rest = test.stockSemence?.quantiteRestante || 0;
                        const utilise = init - rest;
                        const pct = init > 0 ? Math.round((utilise / init) * 100) : 0;
                        const pctColor = pct >= 80 ? '#B02020' : pct >= 40 ? '#92400e' : '#008030';
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <div style={{ width: '50px', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pctColor, borderRadius: '3px', transition: 'width 0.3s ease' }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: pctColor }}>{pct}%</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {stockId && (
                          <Link
                            to={`/stock/${stockId}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              padding: '6px 12px', backgroundColor: '#f3e8ff', color: '#7c3aed',
                              border: '1px solid #e9d5ff', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e9d5ff'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f3e8ff'; }}
                          >
                            <ArrowRight size={14} />
                            Stock
                          </Link>
                        )}
                        {(user?.role === 'admin' || user?.role === 'employe') && (
                          <button
                            onClick={(e) => handleDeleteTest(test._id, e)}
                            title="Supprimer ce test"
                            style={{
                              padding: '6px 10px', backgroundColor: '#fef2f2', color: '#991b1b',
                              border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="9" style={{ padding: '60px 40px', textAlign: 'center' }}>
                    <FlaskConical size={40} style={{ opacity: 0.15, marginBottom: '12px' }} />
                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#222222', margin: 0 }}>
                      {searchTerm ? 'Aucun test trouvé avec ce filtre.' : 'Aucun test de germination pour le moment.'}
                    </p>
                    <p style={{ fontSize: '14px', color: '#111111', marginTop: '4px' }}>
                      {!searchTerm ? 'Ajoutez un test depuis la page détail d\'un stock de semences.' : 'Essayez de modifier votre recherche.'}
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

export default TestsGermination;
