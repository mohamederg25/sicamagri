/**
 * SortiesExternes — Page dédiée aux sorties externes de stock
 * ============================================================
 * Statistiques, historique et ventilation par motif des sorties
 * qui ne sont pas liées à une pépinière.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import ExportButton from '../components/ExportButton';
import { ExternalLink, ArrowUpRight, Calendar, Tag, Sprout, Search, Receipt } from 'lucide-react';
import semisService from '../services/semisService';
import { generateBonPassageInvoice } from '../utils/invoicePDF';

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtNumber = (n) => (n != null ? n.toLocaleString('fr-FR') : '—');

const SortiesExternes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [motifFilter, setMotifFilter] = useState('all');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data } = await semisService.getExternalStats();
      setStats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // ── Filtered recent sorties ──
  const filteredSorties = useMemo(() => {
    if (!stats?.recentSorties) return [];
    return stats.recentSorties.filter((s) => {
      if (motifFilter !== 'all' && (s.motif || 'Non spécifié') !== motifFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        (s.code || '').toLowerCase().includes(q) ||
        (s.variete?.nom || '').toLowerCase().includes(q) ||
        (s.motif || '').toLowerCase().includes(q)
      );
    });
  }, [stats, searchTerm, motifFilter]);

  if (loading) return <Loading />;

  if (!stats) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center', padding: '80px 40px' }}>
        <p style={{ fontSize: '18px', color: '#222222' }}>Aucune donnée disponible.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* ═══ Header ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '28px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#222222', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ExternalLink size={28} color="#D97706" />
            Sorties externes
          </h1>
          <p style={{ fontSize: '18px', color: '#222222', margin: '4px 0 0' }}>
            Historique et statistiques des sorties de stock hors pépinière
          </p>
        </div>
        <button
          onClick={() => navigate('/semis/new')}
          style={{
            padding: '12px 20px',
            backgroundColor: '#D97706',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B45309'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
        >
          <ExternalLink size={18} />
          Nouvelle sortie externe
        </button>
      </div>

      {/* ═══ KPI Cards ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
        marginBottom: '28px',
      }}>
        <div style={{ background: 'white', borderRadius: '14px', padding: '22px 24px', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ExternalLink size={14} />
            Total sorties
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#92400e' }}>
            {stats.totalSorties}
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '14px', padding: '22px 24px', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sprout size={14} />
            Quantité totale
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#222222' }}>
            {fmtNumber(stats.totalQuantite)}
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '14px', padding: '22px 24px', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Tag size={14} />
            Motifs distincts
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#222222' }}>
            {stats.motifBreakdown?.length || 0}
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '14px', padding: '22px 24px', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} />
            Ce mois-ci
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#222222' }}>
            {stats.monthlyStats?.length > 0 ? stats.monthlyStats[stats.monthlyStats.length - 1]?.count || 0 : 0}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
        {/* ═══ Motif Breakdown ═══ */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #fde68a', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#222222', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={18} color="#D97706" />
            Ventilation par motif
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stats.motifBreakdown?.map((item) => {
              const pct = stats.totalQuantite > 0 ? Math.round((item.quantite / stats.totalQuantite) * 100) : 0;
              return (
                <div key={item.motif}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#111111' }}>{item.motif}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>{fmtNumber(item.quantite)} ({item.count} sortie{item.count > 1 ? 's' : ''})</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#fef3c7', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#D97706', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
            {(!stats.motifBreakdown || stats.motifBreakdown.length === 0) && (
              <p style={{ fontSize: '14px', color: '#111111', textAlign: 'center', padding: '20px 0' }}>
                Aucune sortie externe enregistrée
              </p>
            )}
          </div>
        </div>

        {/* ═══ Top Variétés ═══ */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #fde68a', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#222222', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sprout size={18} color="#D97706" />
            Variétés les plus sorties
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stats.topVarietes?.slice(0, 8).map((item, idx) => {
              const pct = stats.totalQuantite > 0 ? Math.round((item.quantite / stats.totalQuantite) * 100) : 0;
              return (
                <div key={item.variete}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#111111', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#92400e' }}>
                        {idx + 1}
                      </span>
                      {item.variete}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111111' }}>{fmtNumber(item.quantite)}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#fef3c7', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#D97706', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
            {(!stats.topVarietes || stats.topVarietes.length === 0) && (
              <p style={{ fontSize: '14px', color: '#111111', textAlign: 'center', padding: '20px 0' }}>
                Aucune donnée
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Monthly Stats Chart ═══ */}
      {stats.monthlyStats && stats.monthlyStats.length > 0 && (
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #fde68a', padding: '24px', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#222222', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="#D97706" />
            Évolution mensuelle
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '140px' }}>
            {stats.monthlyStats.map((m, idx) => {
              const maxQuantite = Math.max(...stats.monthlyStats.map((x) => x.quantite), 1);
              const heightPct = Math.max((m.quantite / maxQuantite) * 100, 4);
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#92400e' }}>{m.count}</span>
                  <div
                    title={`${m.month}: ${m.quantite} graines (${m.count} sorties)`}
                    style={{
                      width: '100%',
                      height: `${heightPct}%`,
                      backgroundColor: '#D97706',
                      borderRadius: '6px 6px 2px 2px',
                      minHeight: '6px',
                      opacity: 0.85,
                      transition: 'height 0.3s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.85'}
                  />
                  <span style={{ fontSize: '9px', fontWeight: 500, color: '#111111', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ History Table ═══ */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #fde68a', overflow: 'hidden' }}>
        {/* Filters */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #fef3c7',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#222222', margin: 0, whiteSpace: 'nowrap' }}>
            Historique des sorties
          </h2>
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#111111' }} />
            <input
              type="text"
              placeholder="Rechercher par code, motif, variété..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#111111', cursor: 'pointer', fontSize: '16px' }}>
                ×
              </button>
            )}
          </div>
          <select
            value={motifFilter}
            onChange={(e) => setMotifFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: 'white',
            }}
          >
            <option value="all">Tous les motifs</option>
            {stats.motifBreakdown?.map((m) => (
              <option key={m.motif} value={m.motif}>{m.motif}</option>
            ))}
          </select>
          <ExportButton
            user={user}
            filename="sorties-externes"
            columns={[
              { accessor: 'code', header: 'Code' },
              { accessor: 'variete.nom', header: 'Variété' },
              { accessor: 'motif', header: 'Motif' },
              { accessor: 'quantite', header: 'Quantité' },
              { accessor: 'createdAt', header: 'Date' },
            ]}
            data={filteredSorties}
            mapRow={(s) => [
              s.code || '-',
              s.variete?.nom || '-',
              s.motif || '-',
              s.quantite?.toString() || '-',
              fmtDate(s.createdAt),
            ]}
          />
          <span style={{ fontSize: '12px', color: '#111111', fontWeight: 500 }}>
            {filteredSorties.length} sur {stats.recentSorties?.length || 0}
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#fffbeb' }}>
                <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Code</th>
                <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Variété</th>
                <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Motif</th>
                <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Quantité</th>
                <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Date</th>
                <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Facture</th>
              </tr>
            </thead>
            <tbody>
              {filteredSorties.length > 0 ? filteredSorties.map((s) => (
                <tr
                  key={s._id}
                  style={{ borderBottom: '1px solid #fef3c7', transition: 'background-color 0.15s ease', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fffbeb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => navigate(`/semis/${s._id}`)}
                >
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: '#D97706', backgroundColor: '#fffbeb', padding: '4px 10px', borderRadius: '6px' }}>
                      {s.code || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#111111' }}>
                      {s.variete?.nom || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                      whiteSpace: 'nowrap',
                    }}>
                      {s.motif || 'Non spécifié'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>
                      {fmtNumber(s.quantite)}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#111111' }}>
                      {fmtDate(s.createdAt)}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/semis/${s._id}`); }}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#D97706',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B45309'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
                    >
                      Détails <ArrowUpRight size={14} />
                    </button>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Build a mouvement-like object from the semis data
                        generateBonPassageInvoice(
                          {
                            referenceBon: s.code || '—',
                            quantite: s.quantite,
                            motif: s.motif || 'Sortie externe',
                            dateMouvement: s.createdAt,
                            createdBy: s.createdBy,
                          },
                          {
                            code: s.code || '—',
                            variete: s.variete,
                            fournisseur: null,
                          }
                        );
                      }}
                      title="Télécharger la facture PDF"
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'white',
                        color: '#B02020',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#B02020';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.color = '#B02020';
                      }}
                    >
                      <Receipt size={14} />
                      PDF
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <p style={{ fontSize: '15px', color: '#111111', margin: 0 }}>
                      {searchTerm || motifFilter !== 'all'
                        ? 'Aucune sortie externe trouvée avec ces filtres.'
                        : 'Aucune sortie externe enregistrée pour le moment.'}
                    </p>
                    <p style={{ fontSize: '14px', color: '#111111', marginTop: '8px' }}>
                      Créez une sortie externe depuis la page <strong>Semis → Nouveau</strong> en choisissant "Sortie externe".
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

export default SortiesExternes;
