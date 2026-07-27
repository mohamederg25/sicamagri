/**
 * Fournisseurs — Fournisseurs (Suppliers) Management Page
 * ========================================================
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import Modal from '../components/common/Modal';
import { Search, Truck, Plus, Pencil, Trash2 } from 'lucide-react';
import fournisseurService from '../services/fournisseurService';
import useSearch from '../hooks/useSearch';
import useSort from '../hooks/useSort';

const emptyForm = { nom: '', contact: '', email: '', telephone: '', adresse: '', statut: 'actif' };

const Fournisseurs = () => {
  const { user, classicMode } = useAuth();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentFournisseur, setCurrentFournisseur] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fournisseurService.getAll();
      setFournisseurs(res.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les fournisseurs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setFormData(emptyForm);
    setCurrentFournisseur(null);
  };

  const validateFournisseur = (data) => {
    if (!data.email && !data.telephone) {
      return 'Vous devez fournir au moins un email ou un téléphone';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const vError = validateFournisseur(formData);
    if (vError) { setError(vError); return; }
    try {
      await fournisseurService.create(formData);
      await fetchData();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const vError = validateFournisseur(formData);
    if (vError) { setError(vError); return; }
    try {
      await fournisseurService.update(currentFournisseur._id, formData);
      await fetchData();
      setIsEditModalOpen(false);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la modification');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce fournisseur ?')) return;
    try {
      await fournisseurService.delete(id);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de supprimer');
    }
  };

  const openCreateModal = () => { resetForm(); setError(''); setIsModalOpen(true); };
  const openEditModal = (f) => {
    setCurrentFournisseur(f);
    setFormData({ nom: f.nom || '', contact: f.contact || '', email: f.email || '', telephone: f.telephone || '', adresse: f.adresse || '', statut: f.statut || 'actif' });
    setError('');
    setIsEditModalOpen(true);
  };

  const renderForm = (onSubmit, submitLabel, onCancel) => (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#111', marginBottom: '5px' }}>Nom *</label>
        <input type="text" required value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#111', marginBottom: '5px' }}>Contact *</label>
        <input type="text" required value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#111', marginBottom: '5px' }}>
            Email {!formData.telephone && <span style={{color:'#B02020'}}>*</span>}
          </label>
          <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
              borderColor: formData.telephone ? '#d1d5db' : formData.email ? '#22c55e' : '#fde68a',
            }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#111', marginBottom: '5px' }}>
            Téléphone {!formData.email && <span style={{color:'#B02020'}}>*</span>}
          </label>
          <input type="text" value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
              borderColor: formData.email ? '#d1d5db' : formData.telephone ? '#22c55e' : '#fde68a',
            }} />
        </div>
      </div>
      {!formData.email && !formData.telephone && (
        <div style={{ padding: '6px 10px', backgroundColor: '#fef3c7', borderRadius: '6px', color: '#92400e', fontSize: '12px', marginTop: '-6px' }}>
          ⚠ Vous devez fournir au moins un email ou un téléphone
        </div>
      )}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#111', marginBottom: '5px' }}>Adresse *</label>
        <textarea required value={formData.adresse} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', minHeight: '50px', resize: 'vertical', fontFamily: 'inherit' }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#111', marginBottom: '5px' }}>Statut</label>
        <select value={formData.statut} onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', boxSizing: 'border-box' }}>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
        </select>
      </div>
      {error && <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '6px', color: '#991b1b', fontSize: '13px' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, padding: '10px', backgroundColor: '#f3f4f6', color: '#111', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
          Annuler
        </button>
        <button type="submit"
          style={{ flex: 2, padding: '10px', backgroundColor: '#008030', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {submitLabel}
        </button>
      </div>
    </form>
  );

  const { searchTerm, setSearchTerm, filteredData } = useSearch(fournisseurs, ['nom', 'code', 'contact', 'email']);
  const { sortedData, handleSort, SortIcon } = useSort(filteredData, { defaultField: 'code' });

  if (loading) return <Loading />;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#222', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Truck size={28} color="#008030" /> Fournisseurs
          </h1>
          <p style={{ fontSize: '15px', color: '#222', margin: 0 }}>Gestion des fournisseurs de semences</p>
        </div>
        {user?.role === 'admin' && (
          <button onClick={openCreateModal}
            style={{ padding: '10px 20px', backgroundColor: '#008030', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Ajouter un fournisseur
          </button>
        )}
      </div>

      {error && <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

      <div style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#111' }} />
          <input type="text" placeholder="Rechercher par nom, code, contact..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 16px 12px 42px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          {searchTerm && <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#111', cursor: 'pointer', fontSize: '16px' }}>×</button>}
        </div>
      </div>

      <div className={classicMode ? 'classic-table' : ''} style={{ backgroundColor: 'white', border: '1px solid #C8E6C9', borderRadius: '16px', overflow: 'hidden' }}>
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th onClick={() => handleSort('code')} style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Code<SortIcon field="code" /></th>
                <th onClick={() => handleSort('nom')} style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Nom<SortIcon field="nom" /></th>
                <th style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>Contact</th>
                <th style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>Email</th>
                <th style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>Téléphone</th>
                <th style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>Statut</th>
                {user?.role === 'admin' && <th style={{ textAlign: 'right', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? sortedData.map((f) => (
                <tr key={f._id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'monospace', color: '#B02020', backgroundColor: '#fef2f2', padding: '4px 12px', borderRadius: '6px', letterSpacing: '0.8px' }}>{f.code || '-'}</span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#222' }}>{f.nom}</span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#222' }}>{f.contact || '—'}</span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#222' }}>{f.email || '—'}</span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#222' }}>{f.telephone || '—'}</span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 700,
                      backgroundColor: f.statut === 'actif' ? '#E8F5E9' : '#f3f4f6',
                      color: f.statut === 'actif' ? '#008030' : '#222',
                      border: `1px solid ${f.statut === 'actif' ? '#bbf7d0' : '#e5e7eb'}` }}>
                      {f.statut === 'actif' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  {user?.role === 'admin' && (
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button onClick={() => openEditModal(f)}
                          style={{ padding: '8px 12px', backgroundColor: '#f3f4f6', color: '#111', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Pencil size={14} /> Modifier
                        </button>
                        <button onClick={() => handleDelete(f._id)}
                          style={{ padding: '8px 12px', backgroundColor: 'white', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Trash2 size={14} /> Suppr.
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={user?.role === 'admin' ? 7 : 6} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <p style={{ fontSize: '15px', color: '#222', margin: 0 }}>
                      {searchTerm ? 'Aucun fournisseur trouvé.' : 'Aucun fournisseur enregistré.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title="Ajouter un fournisseur">
        {renderForm(handleSubmit, 'Créer', () => { setIsModalOpen(false); resetForm(); })}
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); resetForm(); }} title="Modifier le fournisseur">
        {currentFournisseur && renderForm(handleEditSubmit, 'Mettre à jour', () => { setIsEditModalOpen(false); resetForm(); })}
      </Modal>
    </div>
  );
};

export default Fournisseurs;
