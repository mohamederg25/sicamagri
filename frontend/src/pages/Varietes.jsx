import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import Modal from '../components/common/Modal';
import { Search } from 'lucide-react';
import ExportButton from '../components/ExportButton';
import varieteService from '../services/varieteService';
import lotService from '../services/lotService';
import useSearch from '../hooks/useSearch';
import useSort from '../hooks/useSort';
import { VARIETE_STATUS } from '../constants/status';

const emptyForm = { nom: '', statut: 'active' };

const Varietes = () => {
  const [varietes, setVarietes] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentVariete, setCurrentVariete] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const { user, classicMode } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [varietesRes, lotsRes] = await Promise.all([
        varieteService.getAll(),
        lotService.getAll()
      ]);
      setVarietes(varietesRes.data);
      setLots(lotsRes.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les donnees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData(emptyForm);
    setCurrentVariete(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await varieteService.create(formData);
      await fetchData();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Impossible de creer la variete.');
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    try {
      await varieteService.update(currentVariete._id, formData);
      await fetchData();
      setIsEditModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Impossible de modifier la variete.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Etes-vous sur de vouloir supprimer cette variete ?')) {
      try {
        await varieteService.delete(id);
        await fetchData();
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Impossible de supprimer la variete.');
      }
    }
  };

  const openCreateModal = () => {
    resetForm();
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (variete) => {
    setCurrentVariete(variete);
    setFormData({
      nom: variete.nom || '',
      statut: variete.statut || 'active'
    });
    setError('');
    setIsEditModalOpen(true);
  };

  const renderForm = (onSubmit, submitLabel, onCancel) => (
    <form onSubmit={onSubmit} aria-label={submitLabel === 'Créer' ? 'Ajouter une variété' : 'Modifier la variété'} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label htmlFor="variete-nom" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '6px' }}>
          Nom
        </label>
        <input
          id="variete-nom"
          type="text"
          required
          value={formData.nom}
          onChange={(event) => setFormData({ ...formData, nom: event.target.value })}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      <div>
        <label htmlFor="variete-statut" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '6px' }}>
          Statut
        </label>
        <select
          id="variete-statut"
          value={formData.statut}
          onChange={(event) => setFormData({ ...formData, statut: event.target.value })}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', boxSizing: 'border-box' }}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, padding: '10px', backgroundColor: '#f3f4f6', color: '#111111', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
          Annuler
        </button>
        <button type="submit"
          style={{ flex: 2, padding: '10px', backgroundColor: '#008030', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          {submitLabel}
        </button>
      </div>
    </form>
  );

  const { searchTerm, setSearchTerm, filteredData: filteredVarietes } = useSearch(varietes, ['nom', 'code']);
  const { sortedData, handleSort, SortIcon } = useSort(filteredVarietes, { defaultField: 'code' });

  // Count lots per variete: Lot -> Semis -> Variete
  const lotCountByVariete = lots.reduce((acc, lot) => {
    const varieteId = lot.semis?.variete?._id;
    if (varieteId) {
      acc[varieteId] = (acc[varieteId] || 0) + 1;
    }
    return acc;
  }, {});

  if (loading) return <Loading />;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#222222', marginBottom: '4px' }}>Varietes</h1>
          <p style={{ fontSize: '16px', color: '#222222' }}>Nom et statut des varietes</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={openCreateModal}
            style={{
              padding: '10px 20px',backgroundColor: '#008030',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Ajouter une variete
              </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Search Bar + Export */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'stretch' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#111111' }} />
          <input
            type="text"
            placeholder="Rechercher par nom ou code..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 42px',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#111111', cursor: 'pointer', fontSize: '16px'
              }}
            >
              ×
            </button>
          )}
        </div>
<ExportButton
          user={user}
          filename="varietes"
          columns={[{ accessor: 'code', header: 'Code' }, { accessor: 'nom', header: 'Nom' }, { accessor: 'statut', header: 'Statut' }]}
          data={filteredVarietes}
          mapRow={(v) => [v.code || '-', v.nom || '-', v.statut === 'active' ? 'Active' : 'Inactive']}
        />
      </div>

      {/* Table */}
      <div className={classicMode ? 'classic-table' : ''} style={{
        backgroundColor: 'white',
        border: '1px solid #C8E6C9',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th scope="col" onClick={() => handleSort('code')} style={{ cursor: 'pointer', textAlign: 'center', padding: '20px 24px', fontSize: '14px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>
                  Code<SortIcon field="code" />
                </th>
                <th scope="col" onClick={() => handleSort('nom')} style={{ cursor: 'pointer', textAlign: 'center', padding: '20px 24px', fontSize: '14px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>
                  Nom<SortIcon field="nom" />
                </th>
                <th scope="col" onClick={() => handleSort('statut')} style={{ cursor: 'pointer', textAlign: 'center', padding: '20px 24px', fontSize: '14px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>
                  Statut<SortIcon field="statut" />
                </th>
                <th scope="col" style={{ textAlign: 'center', padding: '20px 24px', fontSize: '14px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>
                  Lots
                </th>
                {user?.role === 'admin' && (
                  <th scope="col" style={{ textAlign: 'right', padding: '20px 24px', fontSize: '14px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? sortedData.map((variete) => {
                const style = VARIETE_STATUS[variete.statut] || VARIETE_STATUS.inactive;

                return (
                  <tr key={variete._id} style={{
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background-color 0.15s ease'
                  }} onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      <span style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'monospace', color: '#B02020', backgroundColor: '#fef2f2', padding: '6px 16px', borderRadius: '6px', letterSpacing: '0.8px' }}>{variete.code || '-'}</span>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      <span style={{ fontSize: '17px', fontWeight: 600, color: '#222222' }}>{variete.nom}</span>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '15px',
                          fontWeight: 700,
                          backgroundColor: style.backgroundColor,
                          color: style.color,
                          border: '1px solid',
                          borderColor: style.borderColor
                        }}
                      >
                        {style.label}
                      </span>
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: lotCountByVariete[variete._id] > 0 ? '#008030' : '#9ca3af' }}>
                        {lotCountByVariete[variete._id] || 0}
                      </span>
                    </td>
                    {user?.role === 'admin' && (
                      <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openEditModal(variete)}
                            style={{
                              padding: '10px 16px',
                              backgroundColor: '#f3f4f6',
                              color: '#111111',
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '15px',
                              fontWeight: 500,
                              cursor: 'pointer'
                            }}
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(variete._id)}
                            style={{
                              padding: '10px 16px',
                              backgroundColor: 'white',
                              color: '#ef4444',
                              border: '1px solid #fecaca',
                              borderRadius: '8px',
                              fontSize: '15px',
                              fontWeight: 500,
                              cursor: 'pointer'
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={user?.role === 'admin' ? 5 : 4} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', color: '#222222', margin: 0 }}>
                      {searchTerm ? 'Aucune variété trouvée.' : 'Aucune variété trouvée.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title="Ajouter une variété">
        {renderForm(handleSubmit, 'Créer', () => { setIsModalOpen(false); resetForm(); })}
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); resetForm(); }} title="Modifier la variété">
        {currentVariete && renderForm(handleEditSubmit, 'Mettre à jour', () => { setIsEditModalOpen(false); resetForm(); })}
      </Modal>
    </div>
  );
};

export default Varietes;
