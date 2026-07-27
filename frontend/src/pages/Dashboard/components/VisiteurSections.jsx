/**
 * VisiteurSections — Dashboard sections for visiteur role
 * 
 * Shows nursery cards with stock stats and variety overview tags.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { COLORS } from '../../../constants/colors';
import { fmtNumber } from '../../../utils/dates';
import { sectionStyle, sectionTitleStyle } from '../utils/dashboardStyles';

export const VisiteurPepinieresOverview = ({ pepinieres, semis, lots }) => {
  const pepStats = useMemo(() => {
    const stats = {};
    (pepinieres || []).filter(p => p).forEach(p => {
      const pepId = p._id;
      const pepSemis = (semis || []).filter(s => {
        if (!s) return false;
        return String(s.pepiniere?._id || s.pepiniere) === String(pepId);
      });
      const semisRecu = pepSemis.reduce((sum, s) => sum + (s.quantite || 0), 0);
      const semisUtilise = pepSemis.reduce((sum, s) => sum + (s.quantiteUtilisee || 0), 0);
      const semisDispo = pepSemis.reduce((sum, s) => sum + (s.disponible || 0), 0);
      const pepLots = (lots || []).filter(l => {
        if (!l) return false;
        return String(l.semis?.pepiniere?._id || l.semis?.pepiniere) === String(pepId);
      });
      stats[pepId] = { semisRecu, semisUtilise, semisDispo, lotsCount: pepLots.length };
    });
    return stats;
  }, [pepinieres, semis, lots]);

  return (
    <div style={sectionStyle}>
      <h2 style={sectionTitleStyle}>
         Pépinières
        <Link to="/pepinieres" style={{
          marginLeft: 'auto', fontSize: '0.78rem', color: '#008030',
          textDecoration: 'none', fontWeight: 600,
        }}>
          Voir toutes →
        </Link>
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {(pepinieres || []).slice(0, 6).map((p) => {
          const ps = pepStats[p._id] || {};
          const taux = ps.semisRecu > 0 ? Math.round((ps.semisUtilise / ps.semisRecu) * 100) : 0;
          return (
            <div key={p._id} style={{
              background: 'white', borderRadius: '10px', padding: '16px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              borderLeft: `4px solid ${p.statut === 'actif' ? COLORS.success : COLORS.gray}`,
            }}>
              <div style={{ fontSize: '0.72rem', color: '#A02010', fontWeight: 700, fontFamily: 'monospace', marginBottom: '3px' }}>
                {p.code || '-'}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#222' }}>
                {p.nom}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '4px' }}>
                {p.address || 'Adresse non renseignée'}
              </div>
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700,
                  backgroundColor: p.statut === 'actif' ? '#E8F5E9' : '#FFF8E1',
                  color: p.statut === 'actif' ? '#008030' : '#8D6E00',
                }}>
                  {p.statut === 'actif' ? 'Actif' : 'Non actif'}
                </span>
                {p.surface && (
                  <span style={{ fontSize: '0.68rem', color: '#999' }}>{p.surface} ha</span>
                )}
              </div>
              {ps.semisRecu > 0 && (
                <div style={{
                  marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f0f0f0',
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#222' }}>{fmtNumber(ps.semisRecu)}</div>
                    <div style={{ fontSize: '0.6rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Reçues</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: ps.semisDispo === 0 ? '#B02020' : '#008030' }}>{fmtNumber(ps.semisDispo)}</div>
                    <div style={{ fontSize: '0.6rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Dispo</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: taux >= 80 ? '#B02020' : '#222' }}>{taux}%</div>
                    <div style={{ fontSize: '0.6rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Util.</div>
                  </div>
                </div>
              )}
              {ps.lotsCount > 0 && (
                <div style={{ marginTop: '6px', fontSize: '0.68rem', color: '#888' }}>
                  {ps.lotsCount} lot{ps.lotsCount > 1 ? 's' : ''} enregistré{ps.lotsCount > 1 ? 's' : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const VisiteurVarietesOverview = ({ varietes }) => (
  <div style={sectionStyle}>
    <h2 style={sectionTitleStyle}>
       Variétés
      <Link to="/varietes" style={{
        marginLeft: 'auto', fontSize: '0.78rem', color: '#008030',
        textDecoration: 'none', fontWeight: 600,
      }}>
        Voir toutes →
      </Link>
    </h2>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {(varietes || []).slice(0, 12).map((v) => (
        <span key={v._id} style={{
          background: 'white', padding: '6px 14px', borderRadius: '20px',
          fontSize: '0.82rem', fontWeight: 500, color: '#444',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: v.statut === 'active' ? '1px solid #E8F5E9' : '1px solid #f0f0f0',
        }}>
          {v.nom}
          <span style={{ fontSize: '0.65rem', color: '#aaa', marginLeft: '6px' }}>
            {v.code || ''}
          </span>
        </span>
      ))}
    </div>
  </div>
);
