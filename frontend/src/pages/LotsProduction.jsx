import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import Loading from '../components/Loading';
import ExportButton from '../components/ExportButton';
import lotService from '../services/lotService';
import { Search } from 'lucide-react';
import useSort from '../hooks/useSort';
import Modal from '../components/common/Modal';

const LotsProduction = () => {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pepFilter, setPepFilter] = useState('all');
  const [varFilter, setVarFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [harvestModalOpen, setHarvestModalOpen] = useState(false);
  const [selectedLotForHarvest, setSelectedLotForHarvest] = useState(null);
  const [harvestNombrePlants, setHarvestNombrePlants] = useState('');
  const [useManualHarvest, setUseManualHarvest] = useState(false);
  const [harvestError, setHarvestError] = useState('');
  const { user, fetchAppData, classicMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLots();
  }, []);

  const fetchLots = async () => {
    try {
      setLoading(true);
      const { data } = await lotService.getAll();
      setLots(data.filter(l => l.type === 'production'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived filter options ──
  const pepinieres = useMemo(
    () => [...new Map(lots.map((l) => [l.semis?.pepiniere?._id, { _id: l.semis?.pepiniere?._id, nom: l.semis?.pepiniere?.nom }])).values()].filter((p) => p._id),
    [lots]
  );
  const varietes = useMemo(
    () => [...new Map(lots.map((l) => [l.semis?.variete?._id, { _id: l.semis?.variete?._id, nom: l.semis?.variete?.nom }])).values()].filter((v) => v._id),
    [lots]
  );

  const filteredLots = lots.filter(lot => {
    const pepMatch = pepFilter === 'all' || (lot.semis?.pepiniere?._id || lot.semis?.pepiniere) === pepFilter;
    const varMatch = varFilter === 'all' || (lot.semis?.variete?._id || lot.semis?.variete) === varFilter;
    const statusMatch = statusFilter === 'all' || lot.statut === statusFilter;

    if (!pepMatch || !varMatch || !statusMatch) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (lot.semis?.variete?.nom || '').toLowerCase().includes(q) ||
      (lot.semis?.pepiniere?.nom || '').toLowerCase().includes(q) ||
      (lot.semis?.code || '').toLowerCase().includes(q) ||
      (lot.code || '').toLowerCase().includes(q) ||
      (lot.lotSemenceParent?.code || '').toLowerCase().includes(q)
    );
  });

  const handleHarvestClick = (lot) => {
    setSelectedLotForHarvest(lot);
    let defaultPlants = '';
    if (lot.nombrePlantsProduits) {
      defaultPlants = String(lot.nombrePlantsProduits);
    } else if (lot.quantite && lot.lotSemenceParent) {
      let germinationRate = null;
      const parentLot = lot.lotSemenceParent;
      if (parentLot.tests && parentLot.tests.length > 0) {
        const sortedTests = [...parentLot.tests].sort((a, b) =>
          new Date(b.dateTest || 0) - new Date(a.dateTest || 0)
        );
        germinationRate = sortedTests[0].tauxGermination;
      } else if (parentLot.tauxManuel != null) {
        germinationRate = parentLot.tauxManuel;
      }
      if (germinationRate != null) {
        defaultPlants = String(Math.round((lot.quantite * germinationRate) / 100));
      } else {
        defaultPlants = String(lot.quantite);
      }
    }
    setUseManualHarvest(false);
    setHarvestNombrePlants(defaultPlants);
    setHarvestModalOpen(true);
  };

  const handleConfirmHarvest = async () => {
    if (!selectedLotForHarvest?._id) return;
    setHarvestError('');

    if (useManualHarvest) {
      const val = Number(harvestNombrePlants);
      if (!val || val <= 0) {
        setHarvestError('Veuillez entrer un nombre valide de plantes produites');
        return;
      }
      if (val > selectedLotForHarvest.quantite) {
        setHarvestError(`Le nombre de plantes produites (${val}) ne peut pas dépasser la quantité plantée (${selectedLotForHarvest.quantite})`);
        return;
      }
    }

    try {
      await lotService.markHarvest(
        selectedLotForHarvest._id,
        useManualHarvest && harvestNombrePlants ? Number(harvestNombrePlants) : null
      );
      await fetchLots();
      await fetchAppData();
      setHarvestModalOpen(false);
      setSelectedLotForHarvest(null);
      setHarvestNombrePlants('');
      setUseManualHarvest(false);
      setHarvestError('');
      navigate('/planning');
    } catch (err) {
      setHarvestError(err?.response?.data?.message || 'Erreur lors de la récolte');
    }
  };

  const handleCloseHarvestModal = () => {
    setHarvestModalOpen(false);
    setSelectedLotForHarvest(null);
    setHarvestNombrePlants('');
    setUseManualHarvest(false);
    setHarvestError('');
  };

  const { sortedData, handleSort, SortIcon } = useSort(filteredLots, { defaultField: 'code' });

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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header>
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#111111', margin: 0 }}>Lots de Production</h1>
        <p style={{ fontSize: '18px', color: '#222222', margin: 0 }}>Suivi des lots de production</p>
      </header>

      <div className={classicMode ? 'classic-table' : ''} style={{
        backgroundColor: 'white',
        border: '1px solid #C8E6C9',
        borderRadius: '16px',
        overflow: 'hidden',
        marginTop: '24px'
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
                boxSizing: 'border-box',
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
            <option value="en_cours">En cours</option>
            <option value="pret">Prêt</option>
            <option value="recolte">Récolté</option>
            <option value="livre">Livré</option>
            <option value="annule">Annulé</option>
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
            filename="lots-production"
            columns={[{ accessor: 'code', header: 'Code' }, { accessor: 'semis.code', header: 'Semis' }, { accessor: 'lotSemenceParent.code', header: 'Lot semence' }, { accessor: 'semis.variete.nom', header: 'Variété' }, { accessor: 'semis.pepiniere.nom', header: 'Pépinière' }, { accessor: 'statut', header: 'Statut' }, { accessor: 'quantite', header: 'Quantité' }, { accessor: 'dateEntree', header: 'Date' }]}
            data={filteredLots}
            mapRow={(lot) => {
              let stLabel = 'En cours';
              if (lot.statut === 'pret') stLabel = 'Prêt';
              else if (lot.statut === 'recolte') stLabel = 'Récolté';
              else if (lot.statut === 'livre') stLabel = 'Livré';
              else if (lot.statut === 'annule') stLabel = 'Annulé';
              return [lot.code || '-', lot.semis?.code || '-', lot.lotSemenceParent?.code || '-', lot.semis?.variete?.nom || '-', lot.semis?.pepiniere?.nom || '-', stLabel, lot.quantite?.toString() || '-', lot.dateEntree ? new Date(lot.dateEntree).toLocaleDateString('fr-FR') : '-'];
            }}
          />
          {(user?.role === 'admin' || user?.role === 'ingenieur') && (
            <Link
              to="/lots/new/production"
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
              + Nouveau Lot
            </Link>
          )}
          <span style={{ fontSize: '12px', color: '#111111' }}>
            {filteredLots.length} lot{filteredLots.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th scope="col" onClick={() => handleSort('code')} style={{ cursor: 'pointer', textAlign: 'center', padding: '20px 24px', fontSize: '14px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Code<SortIcon field="code" /></th>
                <th scope="col" onClick={() => handleSort('semis.code')} style={{ cursor: 'pointer', textAlign: 'center', padding: '20px 24px', fontSize: '14px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Semis<SortIcon field="semis.code" /></th>
                <th scope="col" onClick={() => handleSort('lotSemenceParent.code')} style={{ cursor: 'pointer', textAlign: 'center', padding: '20px 24px', fontSize: '14px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Lot semence<SortIcon field="lotSemenceParent.code" /></th>
                <th scope="col" onClick={() => handleSort('semis.variete.nom')} style={{ cursor: 'pointer', textAlign: 'center', padding: '20px 24px', fontSize: '14px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Variété<SortIcon field="semis.variete.nom" /></th>
                <th scope="col" onClick={() => handleSort('semis.pepiniere.nom')} style={{ cursor: 'pointer', textAlign: 'center', padding: '20px 24px', fontSize: '14px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Pépinière<SortIcon field="semis.pepiniere.nom" /></th>
                <th scope="col" onClick={() => handleSort('statut')} style={{ cursor: 'pointer', textAlign: 'center', padding: '20px 24px', fontSize: '14px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Statut<SortIcon field="statut" /></th>
                <th scope="col" onClick={() => handleSort('quantite')} style={{ cursor: 'pointer', textAlign: 'center', padding: '20px 24px', fontSize: '14px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>À planter<SortIcon field="quantite" /></th>
                <th scope="col" onClick={() => handleSort('dateEntree')} style={{ cursor: 'pointer', textAlign: 'center', padding: '20px 24px', fontSize: '14px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Date<SortIcon field="dateEntree" /></th>
                <th scope="col" style={{ textAlign: 'right', padding: '20px 24px', fontSize: '14px', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((lot) => {
                let stLabel = 'En cours';
                let stClass = 'badge-orange';
                if (lot.statut === 'pret') { stLabel = 'Prêt'; stClass = 'badge-green'; }
                else if (lot.statut === 'recolte') { stLabel = 'Récolté'; stClass = 'badge-blue'; }
                else if (lot.statut === 'livre') { stLabel = 'Livré'; stClass = 'badge-green'; }
                else if (lot.statut === 'annule') { stLabel = 'Annulé'; stClass = 'badge-red'; }
                return (
                  <tr key={lot._id} style={{
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background-color 0.15s ease',
                    cursor: 'pointer'
                  }} onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      <span style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'monospace', color: '#006625', backgroundColor: '#f0fdf4', padding: '6px 16px', borderRadius: '6px', letterSpacing: '0.8px' }}>{lot.code || '-'}</span>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 500, color: '#111111' }}>{lot.semis?.code || '-'}</span>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 500, color: '#111111' }}>{lot.lotSemenceParent?.code || '-'}</span>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 600, color: '#111111' }}>{lot.semis?.variete?.nom}</span>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 500, color: '#111111' }}>{lot.semis?.pepiniere?.nom}</span>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      <span className={`badge ${stClass}`} style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 700 }}>{stLabel}</span>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: '#006625' }}>{lot.quantite}</span>
                    </td>
                    <td style={{ padding: '20px 24px' }}>
                      <span style={{ fontSize: '16px', color: '#111111' }}>
                        {lot.dateEntree ? new Date(lot.dateEntree).toLocaleDateString('fr-FR') : '-'}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {lot.statut === 'pret' && (() => {
                          const normalizeDate = (d) => { const dt = new Date(d); dt.setHours(0, 0, 0, 0); return dt; };
                          const today = normalizeDate(new Date());
                          const minDate = lot.expectedReadyDateMin ? normalizeDate(lot.expectedReadyDateMin) : null;
                          const maxDate = lot.maturityWindowEnd ? normalizeDate(lot.maturityWindowEnd) : null;
                          const inWindow = !minDate || (today >= minDate && (!maxDate || today <= maxDate));
                          return inWindow ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleHarvestClick(lot);
                              }}
                              style={{
                                padding: '10px 16px',
                                backgroundColor: '#008030',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Récolter
                            </button>
                          ) : (
                            <span
                              title={today < new Date(lot.expectedReadyDateMin)
                                ? `Maturité à partir du ${new Date(lot.expectedReadyDateMin).toLocaleDateString('fr-FR')}`
                                : `Fenêtre de maturité expirée le ${new Date(lot.maturityWindowEnd).toLocaleDateString('fr-FR')}`
                              }
                              style={{
                                padding: '10px 16px',
                                backgroundColor: '#f3f4f6',
                                color: '#111111',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '15px',
                                fontWeight: 600,
                                cursor: 'not-allowed',
                                display: 'inline-block'
                              }}
                            >
                              Récolter
                            </span>
                          );
                        })()}
                        <Link
                          to={`/lots/${lot._id}`}
                          style={{
                            padding: '10px 16px',
                            backgroundColor: '#008030',
                            color: 'white',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: 500,
                            textDecoration: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Voir
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredLots.length === 0 && (
          <div style={{ padding: '60px 40px', textAlign: 'center', color: '#222222' }}>
            <p style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
              {searchTerm || pepFilter !== 'all' || varFilter !== 'all' || statusFilter !== 'all'
                ? 'Aucun lot trouvé avec ces filtres.'
                : 'Aucun lot de production pour le moment.'}
            </p>
            <p style={{ fontSize: '15px', marginTop: '6px', color: '#111111' }}>
              {searchTerm || pepFilter !== 'all' || varFilter !== 'all' || statusFilter !== 'all'
                ? 'Essayez de modifier les filtres.'
                : 'Créez un lot pour commencer.'}
            </p>
          </div>
        )}
      </div>

      {/* Harvest Modal */}
      <Modal isOpen={harvestModalOpen} onClose={handleCloseHarvestModal} title="Marquer comme récolté">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedLotForHarvest && (
            <p style={{ fontSize: '15px', color: '#222222', margin: 0 }}>
              Lot : <strong style={{ color: '#111111' }}>{selectedLotForHarvest.code}</strong>
              {selectedLotForHarvest.semis?.variete?.nom && (
                <> — <strong style={{ color: '#111111' }}>{selectedLotForHarvest.semis.variete.nom}</strong></>
              )}
            </p>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { setUseManualHarvest(false); setHarvestNombrePlants(''); }}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer',
                border: !useManualHarvest ? '2px solid #008030' : '1px solid #d1d5db',
                backgroundColor: !useManualHarvest ? '#f0fdf4' : 'white',
                color: !useManualHarvest ? '#008030' : '#222222',
              }}
            >
               Automatique
            </button>
            <button
              onClick={() => setUseManualHarvest(true)}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer',
                border: useManualHarvest ? '2px solid #1565C0' : '1px solid #d1d5db',
                backgroundColor: useManualHarvest ? '#f0f9ff' : 'white',
                color: useManualHarvest ? '#1565C0' : '#222222',
              }}
            >
               Manuel
            </button>
          </div>
          {!useManualHarvest && (
            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '10px', fontSize: '14px', color: '#111111', lineHeight: '1.5' }}>
              Calcul automatique à partir du taux de germination du lot parent.
              {selectedLotForHarvest?.quantite && selectedLotForHarvest?.lotSemenceParent && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#222222' }}>
                  Quantité: <strong>{selectedLotForHarvest.quantite}</strong> × Taux germination
                </div>
              )}
            </div>
          )}
          {useManualHarvest && (
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '8px' }}>
                Nombre de plantes produites
              </label>
              <input type="number" min="0" max={selectedLotForHarvest?.quantite}
                value={harvestNombrePlants} onChange={(e) => setHarvestNombrePlants(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #C8E6C9', borderRadius: '10px', fontSize: '16px', outline: 'none', boxSizing: 'border-box', color: '#111111' }}
                placeholder={`Max: ${selectedLotForHarvest?.quantite || '100'}`} />
              <p style={{ fontSize: '12px', color: '#111111', margin: '6px 0 0' }}>
                Maximum : <strong>{selectedLotForHarvest?.quantite}</strong> (quantité plantée)
              </p>
            </div>
          )}
          {harvestError && (
            <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px' }}>
              {harvestError}
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={handleCloseHarvestModal}
              style={{ padding: '12px 20px', backgroundColor: '#f3f4f6', color: '#111111', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
              Annuler
            </button>
            <button onClick={handleConfirmHarvest}
              style={{ padding: '12px 20px', backgroundColor: '#008030', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
              {useManualHarvest ? 'Récolter (manuel)' : 'Récolter (automatique)'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LotsProduction;
