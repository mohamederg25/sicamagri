import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search } from 'lucide-react';
import Loading from '../components/Loading';
import ExportButton from '../components/ExportButton';
import Modal from '../components/common/Modal';
import userService from '../services/userService';
import useSearch from '../hooks/useSearch';
import useSort from '../hooks/useSort';
import { ROLE_BADGE } from '../constants/status';

const initialState = { nom: '', email: '', password: '', role: 'visiteur' };

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState(initialState);
  const [passwordData, setPasswordData] = useState('');
  const [error, setError] = useState('');
  const { user, classicMode } = useAuth();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await userService.getAll();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const { searchTerm, setSearchTerm, filteredData: filteredUsers } = useSearch(users, ['nom', 'email']);
  const { sortedData, handleSort, SortIcon } = useSort(filteredUsers, { defaultField: 'code' });

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await userService.create(formData);
      fetchUsers();
      setIsCreateModalOpen(false);
      setFormData(initialState);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await userService.update(currentUser._id, formData);
      fetchUsers();
      setIsEditModalOpen(false);
      setCurrentUser(null);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la modification");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    if (passwordData.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    try {
      await userService.updatePassword(currentUser._id, { password: passwordData });
      fetchUsers();
      setIsPasswordModalOpen(false);
      setCurrentUser(null);
      setPasswordData('');
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors du changement de mot de passe");
    }
  };

  const handleDeleteUser = async (id, nom) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${nom}" ? Cette action est irréversible.`)) return;
    try {
      await userService.delete(id);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const openEditModal = (user) => {
    setCurrentUser(user);
    setFormData({ nom: user.nom, email: user.email, role: user.role });
    setError('');
    setIsEditModalOpen(true);
  };

  const openPasswordModal = (user) => {
    setCurrentUser(user);
    setPasswordData('');
    setError('');
    setIsPasswordModalOpen(true);
  };



  if (loading) return <Loading />;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#222222', marginBottom: '4px' }}>Gestion des Utilisateurs</h1>
          <p style={{ fontSize: '16px', color: '#222222' }}>Gérez les rôles et accès des membres</p>
        </div>
        <button onClick={() => { setError(''); setIsCreateModalOpen(true); }}
          style={{
            padding: '10px 20px', backgroundColor: '#008030', color: 'white', border: 'none',
            borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#006625'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#008030'}>
          Ajouter Utilisateur
        </button>
      </div>

      {/* Search Bar + Export */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'stretch' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#111111' }} />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 42px',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
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
          filename="utilisateurs"
          columns={[{ accessor: 'nom', header: 'Nom' }, { accessor: 'email', header: 'Email' }, { accessor: 'role', header: 'Rôle' }]}
          data={filteredUsers}
          mapRow={(u) => {
            const roleLabel = { admin: 'Admin', ingenieur: 'Ingénieur', employe: 'Employé', visiteur: 'Visiteur' }[u.role] || u.role;
            return [u.nom || '-', u.email || '-', roleLabel];
          }}
        />
      </div>

      <div className={classicMode ? 'classic-table' : ''} style={{ backgroundColor: 'white', border: '1px solid #C8E6C9', borderRadius: '12px', overflow: 'hidden' }}>
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th onClick={() => handleSort('nom')} style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}>Utilisateur<SortIcon field="nom" /></th>
                <th onClick={() => handleSort('role')} style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}>Rôle<SortIcon field="role" /></th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? sortedData.map((u) => {
                const role = ROLE_BADGE[u.role] || ROLE_BADGE.visiteur;
                return (
                  <tr key={u._id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.15s ease' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', backgroundColor: '#B02020',
                          borderRadius: '8px', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '16px'
                        }}>
                          {u.nom.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937', margin: 0 }}>{u.nom}</p>
                          <p style={{ fontSize: '14px', color: '#222222', margin: 0 }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        fontSize: '13px', fontWeight: 700, textTransform: 'capitalize',
                        padding: '6px 12px', borderRadius: '8px',
                        backgroundColor: role.bg, color: role.color,
                        border: `1px solid ${role.border}`
                      }}>
                        {role.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button onClick={() => openEditModal(u)} style={btnStyle}>
                          Modifier
                        </button>
                        <button onClick={() => openPasswordModal(u)} style={{ ...btnStyle, color: '#d97706', border: '1px solid #fed7aa' }}>
                          Mot de passe
                        </button>
                        <button onClick={() => handleDeleteUser(u._id, u.nom)} style={{ ...btnStyle, color: '#ef4444', border: '1px solid #fecaca' }}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="3" style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', color: '#222222', margin: 0 }}>
                      {searchTerm ? 'Aucun utilisateur trouvé.' : 'Aucun utilisateur trouvé'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <UserFormModal
        isOpen={isCreateModalOpen}
        onClose={() => { setError(''); setIsCreateModalOpen(false); }}
        title="Ajouter un utilisateur"
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleCreateUser}
        error={error}
        submitLabel="Créer"
        showPassword
      />

      {/* Edit Modal */}
      <UserFormModal
        isOpen={isEditModalOpen}
        onClose={() => { setError(''); setIsEditModalOpen(false); setCurrentUser(null); }}
        title="Modifier l'utilisateur"
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleEditUser}
        error={error}
        submitLabel="Mettre à jour"
      />

      {/* Password Modal */}
      <Modal isOpen={isPasswordModalOpen} onClose={() => { setError(''); setIsPasswordModalOpen(false); }} title="Changer le mot de passe">
        {currentUser && (
          <>
            {error && <ErrorBanner message={error} />}
            <form onSubmit={handleChangePassword} aria-label="Changer le mot de passe" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '15px', color: '#222222', margin: 0 }}>
                  Nouveau mot de passe pour <strong>{currentUser.nom}</strong>
                </p>
              </div>
              <div>
                <label htmlFor="user-new-password" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '6px' }}>
                  Nouveau mot de passe
                </label>
                <input id="user-new-password" type="password" required minLength={6}
                  autoComplete="new-password"
                  value={passwordData}
                  onChange={(e) => setPasswordData(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => { setError(''); setIsPasswordModalOpen(false); }}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#f3f4f6', color: '#111111', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button type="submit"
                  style={{ flex: 2, padding: '10px', backgroundColor: '#008030', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                  Mettre à jour le mot de passe
                </button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
};

/*  Reusable User Form Modal  */
const UserFormModal = ({ isOpen, onClose, title, formData, setFormData, onSubmit, error, submitLabel, showPassword }) => {
  if (!isOpen) return null;
  return (
    <div style={modalOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div style={modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <h2 id="modal-title" style={{ fontSize: '20px', fontWeight: 700, color: '#222222', margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Fermer"
            style={{ fontSize: '20px', fontWeight: 500, color: '#222222', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
        </div>

        {error && <ErrorBanner message={error} />}

        <form onSubmit={onSubmit} aria-label={title} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="user-nom" style={labelStyle}>Nom complet</label>
            <input id="user-nom" type="text" required value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              style={inputStyle} />
          </div>
          <div>
            <label htmlFor="user-email" style={labelStyle}>Email</label>
            <input id="user-email" type="email" required value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={inputStyle} />
          </div>
          {showPassword && (
            <div>
              <label htmlFor="user-password" style={labelStyle}>Mot de passe</label>
              <input id="user-password" type="password" required minLength={6}
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Au moins 6 caractères"
                style={inputStyle} />
            </div>
          )}
          <div>
            <label htmlFor="user-role" style={labelStyle}>Rôle</label>
            <select id="user-role" value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              style={{ ...inputStyle, backgroundColor: 'white' }}>
              <option value="admin">Admin</option>
              <option value="ingenieur">Ingénieur</option>
              <option value="employe">Employé</option>
              <option value="visiteur">Visiteur</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', backgroundColor: '#f3f4f6', color: '#111111', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
              Annuler
            </button>
            <button type="submit"
              style={{ flex: 2, padding: '10px', backgroundColor: '#008030', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ErrorBanner = ({ message, id }) => (
  <div id={id} role="alert" aria-live="assertive" style={{
    padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fecaca',
    borderRadius: '8px', color: '#991b1b', fontSize: '14px', fontWeight: 500
  }}>
    {message}
  </div>
);

/*  Shared styles  */
const thStyle = {
  textAlign: 'center', padding: '16px 20px', fontSize: '12px', fontWeight: 700,
  color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9'
};

const btnStyle = {
  padding: '8px 12px', backgroundColor: 'white', color: '#111111',
  border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px',
  fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease'
};

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
  borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
};

const labelStyle = {
  display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '6px'
};

const modalOverlay = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '24px', zIndex: 50
};

const modalContent = {
  width: '100%', maxWidth: '480px', backgroundColor: 'white',
  borderRadius: '12px', padding: '28px'
};

const modalHeader = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px'
};

export default Users;
