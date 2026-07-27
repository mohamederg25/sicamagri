import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Loading from '../components/Loading';
import { Search } from 'lucide-react';
import useSort from '../hooks/useSort';
import ExportButton from '../components/ExportButton';
import { modalOverlayStyle, modalContentStyle } from '../utils/styles';
import pepiniereService from '../services/pepiniereService';

const Pepinieres = () => {
  const [pepinieres, setPepinieres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPepiniere, setCurrentPepiniere] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { user, classicMode } = useAuth();

  const [formData, setFormData] = useState({
    nom: '',
    address: '',
    number: '',
    email: '',
    statut: 'actif'
  });
  const [touched, setTouched] = useState({});

  useEffect(() => {
    fetchPepinieres();
  }, []);

  const fetchPepinieres = async () => {
    try {
      setLoading(true);
      const { data } = await pepiniereService.getAll();
      setPepinieres(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getFieldBorder = (field, isRequired = false) => {
    if (!touched[field]) return '#d1d5db';
    const val = formData[field];
    if (typeof val === 'string' && val.trim()) return '#22c55e';
    return isRequired ? '#ef4444' : '#d1d5db';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTouched({ nom: true, address: true, number: true, email: true });
    if (!formData.nom.trim()) {
      setError('Le nom de la pépinière est requis.');
      return;
    }
    try {
      await pepiniereService.create(formData);
      fetchPepinieres();
      setIsModalOpen(false);
      setError('');
      setFormData({ nom: '', address: '', number: '', email: '', statut: 'actif' });
    } catch (error) {
      setError(error.response?.data?.message || 'Erreur lors de la création de la pépinière');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTouched({ nom: true, address: true, number: true, email: true });
    if (!formData.nom.trim()) {
      setError('Le nom de la pépinière est requis.');
      return;
    }
    try {
      await pepiniereService.update(currentPepiniere._id, formData);
      fetchPepinieres();
      setIsEditModalOpen(false);
      setCurrentPepiniere(null);
      setError('');
    } catch (error) {
      setError(error.response?.data?.message || 'Erreur lors de la modification de la pépinière');
    }
  };

  const deletePepiniere = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette pépinière ?')) {
      try {
        setError('');
        await pepiniereService.delete(id);
        fetchPepinieres();
      } catch (error) {
        setError(error.response?.data?.message || 'Impossible de supprimer la pépinière');
      }
    }
  };

  const openEditModal = (pepiniere) => {
    setError('');
    setTouched({});
    setCurrentPepiniere(pepiniere);
    setFormData({
      nom: pepiniere.nom,
      address: pepiniere.address || '',
      number: pepiniere.number || '',
      email: pepiniere.email || '',
      statut: pepiniere.statut || 'actif'
    });
    setIsEditModalOpen(true);
  };

  const filteredPepinieres = pepinieres.filter(p => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (p.nom && p.nom.toLowerCase().includes(q)) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.address && p.address.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  });
  const { sortedData, handleSort, SortIcon } = useSort(filteredPepinieres, { defaultField: 'code' });

  const renderFormFields = (prefix = '') => (
    <>
      <div>
        <label htmlFor={`${prefix}pep-nom`} style={labelStyle}>
          Nom {touched.nom && formData.nom.trim() && <span style={{color:'#22c55e', fontSize:'13px'}}>✓</span>}
        </label>
        <input id={`${prefix}pep-nom`} type="text" required value={formData.nom}
          onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
          onBlur={() => handleBlur('nom')}
          style={{ ...inputStyle, borderColor: getFieldBorder('nom', true), transition: 'border-color 0.2s ease' }} />
        {touched.nom && !formData.nom.trim() && (
          <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>Champ requis</div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label htmlFor={`${prefix}pep-address`} style={labelStyle}>
            Adresse {touched.address && formData.address.trim() && <span style={{color:'#22c55e', fontSize:'13px'}}>✓</span>}
          </label>
          <input id={`${prefix}pep-address`} type="text" value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            onBlur={() => handleBlur('address')}
            style={{ ...inputStyle, borderColor: getFieldBorder('address'), transition: 'border-color 0.2s ease' }} />
        </div>
        <div>
          <label htmlFor={`${prefix}pep-number`} style={labelStyle}>
            Téléphone {touched.number && formData.number.trim() && <span style={{color:'#22c55e', fontSize:'13px'}}>✓</span>}
          </label>
          <input id={`${prefix}pep-number`} type="text" value={formData.number}
            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
            onBlur={() => handleBlur('number')}
            style={{ ...inputStyle, borderColor: getFieldBorder('number'), transition: 'border-color 0.2s ease' }} />
        </div>
      </div>
      <div>
        <label htmlFor={`${prefix}pep-email`} style={labelStyle}>
          Email {touched.email && formData.email.trim() && <span style={{color:'#22c55e', fontSize:'13px'}}>✓</span>}
        </label>
        <input id={`${prefix}pep-email`} type="email" value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          onBlur={() => handleBlur('email')}
          style={{ ...inputStyle, borderColor: getFieldBorder('email'), transition: 'border-color 0.2s ease' }} />
      </div>
      <div>
        <label htmlFor={`${prefix}pep-statut`} style={labelStyle}>Statut</label>
        <select id={`${prefix}pep-statut`} value={formData.statut}
          onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
          style={{ ...inputStyle, backgroundColor: 'white' }}>
          <option value="actif">Actif</option>
          <option value="non actif">Non actif</option>
        </select>
      </div>
    </>
  );

  if (loading) return <Loading />;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#222222', margin: 0, marginBottom: '4px' }}>Pépinières</h1>
          <p style={{ fontSize: '18px', color: '#222222', margin: 0 }}>Gérez vos sites de production</p>
        </div>
        {user?.role === 'admin' && (
          <button onClick={() => { setError(''); setTouched({}); setIsModalOpen(true); }}
            style={{ padding: '14px 28px',backgroundColor: '#008030', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'}}>
            + Ajouter
          </button>
        )}
      </div>

      {/* Search + Export */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'stretch' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#111111' }} />
          <input type="text" placeholder="Rechercher une pépinière..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '16px 20px 16px 50px', border: '1px solid #d1d5db', borderRadius: '12px', fontSize: '17px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#111111', cursor: 'pointer', fontSize: '20px', padding: '4px' }}>×</button>
          )}
        </div>
<ExportButton
          user={user}
          filename="pepinieres"
          columns={[{ accessor: 'code', header: 'Code' }, { accessor: 'nom', header: 'Nom' }, { accessor: 'statut', header: 'Statut' }, { accessor: 'address', header: 'Adresse' }]}
          data={filteredPepinieres}
          mapRow={(p) => [p.code || '-', p.nom || '-', p.statut === 'actif' ? 'Actif' : 'Non actif', p.address || '-']}
        />
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '14px 20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9', fontSize: '16px', color: '#222222' }}>
        <strong style={{ color: '#222222' }}>{filteredPepinieres.length}</strong> pépinière{filteredPepinieres.length > 1 ? 's' : ''}
        <span style={{ color: '#008030' }}>● {filteredPepinieres.filter(p => p.statut === 'actif').length} active{filteredPepinieres.filter(p => p.statut === 'actif').length > 1 ? 's' : ''}</span>
        <span style={{ color: '#8D6E00' }}>● {filteredPepinieres.filter(p => p.statut !== 'actif').length} inactive{filteredPepinieres.filter(p => p.statut !== 'actif').length > 1 ? 's' : ''}</span>
      </div>

      {/* Compact Table — fits without horizontal scroll */}
      {filteredPepinieres.length > 0 ? (
        <div className={classicMode ? 'classic-table table-scroll' : 'table-scroll'} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th onClick={() => handleSort('code')} style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}>Code<SortIcon field="code" /></th>
                <th onClick={() => handleSort('nom')} style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}>Nom<SortIcon field="nom" /></th>
                <th onClick={() => handleSort('statut')} style={{ ...thStyle, textAlign: 'center', width: '100px', cursor: 'pointer', userSelect: 'none' }}>Statut<SortIcon field="statut" /></th>
                <th style={thStyle}>Ingénieur</th>
                <th style={{ ...thStyle, textAlign: 'right', width: '170px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((pep) => (
                <tr key={pep._id} style={trStyle}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'monospace', color: '#B02020', backgroundColor: '#fef2f2', padding: '6px 16px', borderRadius: '6px', letterSpacing: '0.8px' }}>
                      {pep.code || '-'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: '17px', fontWeight: 600, color: '#222222' }}>{pep.nom}</div>
                    {pep.address && <div style={{ fontSize: '14px', color: '#111111', marginTop: '2px' }}>{pep.address}</div>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '6px 14px', borderRadius: '20px',
                      fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap',
                      backgroundColor: pep.statut === 'actif' ? '#E8F5E9' : '#FFF8E1',
                      color: pep.statut === 'actif' ? '#008030' : '#8D6E00',
                      border: pep.statut === 'actif' ? '1px solid #C8E6C9' : '1px solid #FFE082',
                    }}>
                      {pep.statut === 'actif' ? 'Actif' : 'Non actif'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {pep.ingenieur ? (
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: '#e0f2fe',
                        color: '#075985',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                      }}>
                        {pep.ingenieur.nom}
                      </span>
                    ) : (
                      <span style={{ fontSize: '15px', color: '#111111', fontStyle: 'italic' }}>Aucun</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                      <Link to={`/pepinieres/${pep._id}`}
                        style={{ padding: '8px 18px', backgroundColor: '#008030', color: 'white', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', textAlign: 'center' }}>
                        Voir
                      </Link>
                      {user?.role === 'admin' && (
                        <>
                          <button onClick={() => openEditModal(pep)}
                            style={{ padding: '8px 18px', backgroundColor: 'white', color: '#111111', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }}>
                            Modifier
                          </button>
                          <button onClick={() => deletePepiniere(pep._id)}
                            style={{ padding: '8px 18px', backgroundColor: 'white', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }}>
                            Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '80px 40px', textAlign: 'center', color: '#222222', backgroundColor: 'white', borderRadius: '14px', border: '1px solid #C8E6C9' }}>
          <p style={{ fontSize: '18px', fontWeight: 600, margin: 0, marginBottom: '8px' }}>
            {searchTerm ? 'Aucune pépinière trouvée.' : 'Aucune pépinière pour le moment.'}
          </p>
          <p style={{ fontSize: '16px', margin: 0 }}>
            {searchTerm ? 'Essayez une autre recherche.' : 'Cliquez sur \"Ajouter\" pour commencer.'}
          </p>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="create-pep-modal-title" style={modalOverlayStyle} onClick={() => { setIsModalOpen(false); setError(''); setTouched({}); }}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 id="create-pep-modal-title" style={{ fontSize: '24px', fontWeight: 700, color: '#222222', margin: 0 }}>Ajouter une pépinière</h2>
              <button onClick={() => { setIsModalOpen(false); setError(''); setTouched({}); }} aria-label="Fermer" style={{ fontSize: '24px', fontWeight: 500, color: '#222222', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
            </div>
            {error && <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px', marginBottom: '8px' }}>{error}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {renderFormFields('create-')}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => { setIsModalOpen(false); setError(''); setTouched({}); }}
                  style={{ flex: 1, padding: '14px', backgroundColor: '#f3f4f6', color: '#111111', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '16px', fontWeight: 500, cursor: 'pointer' }}>Annuler</button>
                <button type="submit"
                  style={{ flex: 2, padding: '14px', backgroundColor: '#008030', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && currentPepiniere && (
        <div role="dialog" aria-modal="true" aria-labelledby="edit-pep-modal-title" style={modalOverlayStyle} onClick={() => { setIsEditModalOpen(false); setError(''); setTouched({}); }}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 id="edit-pep-modal-title" style={{ fontSize: '24px', fontWeight: 700, color: '#222222', margin: 0 }}>Modifier la pépinière</h2>
              <button onClick={() => { setIsEditModalOpen(false); setError(''); setTouched({}); }} aria-label="Fermer" style={{ fontSize: '24px', fontWeight: 500, color: '#222222', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
            </div>
            {error && <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px', marginBottom: '8px' }}>{error}</div>}
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {renderFormFields('edit-')}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => { setIsEditModalOpen(false); setError(''); setTouched({}); }}
                  style={{ flex: 1, padding: '14px', backgroundColor: '#f3f4f6', color: '#111111', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '16px', fontWeight: 500, cursor: 'pointer' }}>Annuler</button>
                <button type="submit"
                  style={{ flex: 2, padding: '14px', backgroundColor: '#008030', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>Mettre à jour</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const labelStyle = { display: 'block', fontSize: '16px', fontWeight: 600, color: '#111111', marginBottom: '8px' };
const inputStyle = { width: '100%', padding: '14px 16px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const thStyle = { padding: '18px 20px', fontSize: '15px', fontWeight: 700, color: '#111111', textAlign: 'center', borderBottom: '1px solid #C8E6C9', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em' };
const tdStyle = { padding: '18px 20px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' };
const trStyle = { borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.15s ease', cursor: 'pointer' };



export default Pepinieres;
