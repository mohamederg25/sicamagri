/**
 * History — Page "Historique" : Suivi du cycle complet
 * ======================================================
 * Affiche la timeline des actions clés du cycle de production :
 *   🌱 Semis → 🔬 Test germination → 📦 Production → 🌾 Récolte → 🚚 Livraison
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import ExportButton from '../components/ExportButton';
import activityService from '../services/activityService';
import { fmtDate } from '../utils/dates';

import { Sprout, Package, FlaskConical, Wheat, Truck, ExternalLink, Warehouse, FileText, Users, Settings, Building2, Store, ClipboardList } from 'lucide-react';

/* ── Event type config — all lifecycle + stock events ── */
const EVENT_CFG = {
  semis_creation:        { icon: 'semis',    label: 'Semis créé',         colour: '#008030', bg: '#E8F5E9' },
  lot_creation:          { icon: 'lot',      label: 'Lot créé',           colour: '#1565C0', bg: '#E3F2FD' },
  lot_recolte:           { icon: 'harvest',  label: 'Récolte',            colour: '#006625', bg: '#dcfce7' },
  lot_livraison:         { icon: 'truck',    label: 'Livraison',          colour: '#008030', bg: '#f0fdf4' },
  stock_entree:          { icon: 'warehouse',label: 'Entrée stock',       colour: '#008030', bg: '#E8F5E9' },
  stock_sortie_pepiniere:{ icon: 'semis',    label: 'Sortie pépinière',   colour: '#1565C0', bg: '#E3F2FD' },
  stock_bon_passage:     { icon: 'external', label: 'Bon de passage',     colour: '#8D6E00', bg: '#FFF8E1' },
  stock_test_germination:{ icon: 'flask',    label: 'Test germination',   colour: '#7c3aed', bg: '#f3e8ff' },
  // Admin / CRUD events
  admin_pepiniere_created:    { icon: 'building', label: 'Pépinière créée',       colour: '#0D47A1', bg: '#E3F2FD' },
  admin_pepiniere_updated:    { icon: 'building', label: 'Pépinière mise à jour', colour: '#1565C0', bg: '#E3F2FD' },
  admin_pepiniere_deleted:    { icon: 'building', label: 'Pépinière supprimée',   colour: '#B71C1C', bg: '#FFEBEE' },
  admin_pepiniere_assigned:   { icon: 'users',    label: 'Ingénieur assigné',     colour: '#2E7D32', bg: '#E8F5E9' },
  admin_pepiniere_unassigned: { icon: 'users',    label: 'Ingénieur retiré',      colour: '#E65100', bg: '#FFF3E0' },
  admin_variete_created:      { icon: 'clipboard',label: 'Variété créée',         colour: '#4A148C', bg: '#F3E5F5' },
  admin_variete_updated:      { icon: 'clipboard',label: 'Variété mise à jour',   colour: '#6A1B9A', bg: '#F3E5F5' },
  admin_variete_deleted:      { icon: 'clipboard',label: 'Variété supprimée',     colour: '#B71C1C', bg: '#FFEBEE' },
  admin_fournisseur_created:  { icon: 'store',    label: 'Fournisseur créé',      colour: '#004D40', bg: '#E0F2F1' },
  admin_fournisseur_updated:  { icon: 'store',    label: 'Fournisseur mis à jour',colour: '#00695C', bg: '#E0F2F1' },
  admin_fournisseur_deleted:  { icon: 'store',    label: 'Fournisseur supprimé',  colour: '#B71C1C', bg: '#FFEBEE' },
  admin_user_created:         { icon: 'users',    label: 'Utilisateur créé',      colour: '#1A237E', bg: '#E8EAF6' },
  admin_user_updated:         { icon: 'users',    label: 'Utilisateur mis à jour',colour: '#283593', bg: '#E8EAF6' },
  admin_user_deleted:         { icon: 'users',    label: 'Utilisateur supprimé',  colour: '#B71C1C', bg: '#FFEBEE' },
  admin_rule_created:         { icon: 'settings', label: 'Cycle de semis créé',   colour: '#E65100', bg: '#FFF3E0' },
  admin_rule_updated:         { icon: 'settings', label: 'Cycle mis à jour',      colour: '#EF6C00', bg: '#FFF3E0' },
  admin_rule_deleted:         { icon: 'settings', label: 'Cycle supprimé',        colour: '#B71C1C', bg: '#FFEBEE' },
  admin_semis_created:        { icon: 'semis',    label: 'Semis créé (admin)',    colour: '#008030', bg: '#E8F5E9' },
  admin_semis_updated:        { icon: 'semis',    label: 'Semis mis à jour',      colour: '#1565C0', bg: '#E3F2FD' },
  admin_semis_deleted:        { icon: 'semis',    label: 'Semis supprimé',        colour: '#B71C1C', bg: '#FFEBEE' },
  admin_stock_deleted:        { icon: 'warehouse',label: 'Stock supprimé',        colour: '#B71C1C', bg: '#FFEBEE' },
  admin_stock_taux_updated:   { icon: 'warehouse',label: 'Taux germination mis à jour', colour: '#7c3aed', bg: '#f3e8ff' },
};

const History = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PER_PAGE = 50;

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const { data } = await activityService.getAll();
      setEvents(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return events.filter((evt) => {
      if (typeFilter !== 'all' && evt.type !== typeFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        evt.entity?.toLowerCase().includes(q) ||
        evt.variete?.toLowerCase().includes(q) ||
        evt.pepiniere?.toLowerCase().includes(q) ||
        evt.label?.toLowerCase().includes(q) ||
        evt.details?.toLowerCase().includes(q) ||
        evt.user?.toLowerCase().includes(q)
      );
    });
  }, [events, searchTerm, typeFilter]);

  const paginated = useMemo(() => {
    return filtered.slice(0, page * PER_PAGE);
  }, [filtered, page]);

  if (loading) return <Loading />;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#222222', margin: 0 }}>Historique</h1>
          <p style={{ fontSize: '18px', color: '#222222', margin: 0 }}>
            Tous les événements — stock, semis, production, livraison
          </p>
        </div>
        <span style={{
          padding: '6px 14px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 700,
          backgroundColor: '#E8F5E9',
          color: '#008030',
          whiteSpace: 'nowrap',
        }}>
          {filtered.length} événement{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'white', border: '1px solid #C8E6C9', borderRadius: '12px',
        padding: '16px 20px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Rechercher par code, variété, pépinière, utilisateur..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            style={{
              width: '100%', padding: '10px 16px',
              border: '1px solid #d1d5db', borderRadius: '8px',
              fontSize: '14px', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setPage(1); }}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#111111', cursor: 'pointer', fontSize: '16px' }}
            >×</button>
          )}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', background: 'white' }}
        >
          <option value="all">Toutes les étapes</option>
          <option value="semis_creation"> Semis créés</option>
          <option value="lot_creation"> Lots créés</option>
          <option value="lot_recolte"> Récoltes</option>
          <option value="lot_livraison"> Livraisons</option>
          <option value="stock_entree"> Entrées stock</option>
          <option value="stock_sortie_pepiniere"> Sorties pépinière</option>
          <option value="stock_bon_passage"> Bons de passage</option>
          <option value="stock_test_germination"> Tests germination</option>
          <option disabled style={{ fontSize: '10px', color: '#999' }}>──────────</option>
          <option value="admin_pepiniere_created"> Pépinières</option>
          <option value="admin_variete_created"> Variétés</option>
          <option value="admin_fournisseur_created"> Fournisseurs</option>
          <option value="admin_user_created"> Utilisateurs</option>
          <option value="admin_rule_created"> Cycles de semis</option>
        </select>
        <ExportButton
          user={user}
          filename="historique-production"
          columns={[
            { accessor: 'label', header: 'Étape' },
            { accessor: 'entity', header: 'Entité' },
            { accessor: 'variete', header: 'Variété' },
            { accessor: 'pepiniere', header: 'Pépinière' },
            { accessor: 'details', header: 'Détails' },
            { accessor: 'date', header: 'Date' },
            { accessor: 'user', header: 'Utilisateur' },
          ]}
          data={filtered}
          mapRow={(evt) => [
            evt.label || '-',
            evt.entity || '-',
            evt.variete || '-',
            evt.pepiniere || '-',
            evt.details || '-',
            evt.date ? fmtDate(evt.date) : '-',
            evt.user || '-',
          ]}
        />
      </div>

      {/* Timeline */}
      {paginated.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {paginated.map((evt, idx) => {
            const cfg = EVENT_CFG[evt.type] || { icon: '●', label: 'Événement', colour: '#6b7280', bg: '#f3f4f6' };
            return (
              <div
                key={`${evt.type}-${evt.entity}-${idx}-${evt.date}`}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: '12px',
                  backgroundColor: 'white',
                  border: '1px solid #C8E6C9',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
              >
                {/* Icon badge */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  backgroundColor: cfg.bg, color: cfg.colour,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {(() => {
                    switch(cfg.icon) {
                      case 'semis': return <Sprout size={20} />;
                      case 'lot': return <Package size={20} />;
                      case 'flask': return <FlaskConical size={20} />;
                      case 'harvest': return <Wheat size={20} />;
                      case 'truck': return <Truck size={20} />;
                      case 'warehouse': return <Warehouse size={20} />;
                      case 'external': return <ExternalLink size={20} />;
                      case 'building': return <Building2 size={20} />;
                      case 'users': return <Users size={20} />;
                      case 'clipboard': return <ClipboardList size={20} />;
                      case 'store': return <Store size={20} />;
                      case 'settings': return <Settings size={20} />;
                      default: return <FileText size={20} />;
                    }
                  })()}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: cfg.colour }}>
                      {evt.label}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#111111' }}>
                      {evt.entity}
                    </span>
                    {evt.variete && (
                      <span style={{ fontSize: '11px', color: '#222222' }}>
                        {evt.variete}{evt.pepiniere ? ` — ${evt.pepiniere}` : ''}
                      </span>
                    )}
                  </div>
                  {evt.details && (
                    <p style={{ fontSize: '12px', color: '#222222', margin: '2px 0 0', lineHeight: '1.4' }}>
                      {evt.details}
                    </p>
                  )}
                </div>

                {/* Meta (date + user + link) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '2px', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', color: '#111111', whiteSpace: 'nowrap' }}>
                    {fmtDate(evt.date)}
                  </span>
                  <span style={{ fontSize: '10px', color: '#111111' }}>
                    par {evt.user}
                  </span>
                  {evt.entityPath && (
                    <Link to={evt.entityPath} style={{ fontSize: '10px', fontWeight: 600, color: '#008030', textDecoration: 'none' }}>
                      Voir →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          {/* Load more */}
          {paginated.length < filtered.length && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <button
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: '10px 24px', backgroundColor: '#008030', color: 'white',
                  border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Afficher plus ({filtered.length - paginated.length} restants)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '80px 40px', textAlign: 'center', color: '#222222', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9' }}>
          <p style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
            {searchTerm || typeFilter !== 'all' ? 'Aucun événement trouvé.' : 'Aucune activité enregistrée pour le moment.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default History;
