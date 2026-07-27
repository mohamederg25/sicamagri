/**
 * ComparatifLivraison — Livré vs Planifié Horizontal Bar Chart
 * =============================================================
 *
 * Inspired by the SICAM Pépinière "Stock Glissant" dashboard design.
 * Compares delivered quantities against planned quantities per pépinière.
 *
 * Props:
 *   lots       — Array of lot objects from appData
 *   pepinieres — Array of pepiniere objects for name resolution
 */

import { useMemo } from 'react';

/* ── Style helpers ── */
const styles = {
  section: {
    background: 'white',
    margin: '0 28px 20px',
    borderRadius: '12px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  header: {
    padding: '14px 20px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: 0,
  },
  body: {
    padding: '16px 20px',
  },
  barsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '150px 1fr 100px',
    gap: '12px',
    alignItems: 'center',
  },
  label: {
    fontWeight: 600,
    fontSize: '0.85rem',
    color: '#444',
  },
  labelSub: {
    display: 'block',
    fontSize: '0.72rem',
    color: '#888',
    fontWeight: 400,
    marginTop: '2px',
  },
  barWrap: {
    background: '#f1f5f9',
    borderRadius: '8px',
    height: '36px',
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid #C8E6C9',
  },
  barPrev: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    background: '#E1F0FF',
    borderRight: '2px dashed #3699FF',
    transition: 'width 0.3s ease',
  },
  barReal: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    background: '#1e1e2d',
    transition: 'width 0.5s ease',
  },
  barText: {
    position: 'absolute',
    top: '50%',
    right: '10px',
    transform: 'translateY(-50%)',
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#181C32',
    textShadow: '0 1px 2px rgba(255,255,255,0.7)',
    zIndex: 2,
  },
};

const getEcartStyle = (ratio) => {
  if (ratio >= 90) return { background: '#C9F7F5', color: '#0BB7AF' };
  if (ratio >= 50) return { background: '#FFF4DE', color: '#EE9D01' };
  return { background: '#FFE2E5', color: '#EE2D41' };
};

const getEcartLabel = (ratio) => {
  if (ratio >= 90) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0BB7AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {ratio.toFixed(0)}%
      </span>
    );
  }
  if (ratio >= 50) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EE9D01" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        {ratio.toFixed(0)}%
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EE2D41" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      {ratio.toFixed(0)}%
    </span>
  );
};

/**
 * Compute comparative data from lots.
 * Groups production lots by pépinière and sums quantities.
 */
const computeComparatif = (lots, pepinieres) => {
  const pepMap = {};
  (pepinieres || []).forEach((p) => {
    if (p && p._id) pepMap[p._id] = p.nom || p.code || 'Inconnu';
  });

  const totals = {}; // pepId → { planned, delivered }

  (lots || [])
    .filter((l) => l && l.type === 'production')
    .forEach((lot) => {
      const pepId =
        lot.semis?.pepiniere?._id ||
        lot.semis?.pepiniere ||
        lot.pepiniere?._id ||
        lot.pepiniere;
      if (!pepId) return;

      if (!totals[pepId]) totals[pepId] = { planned: 0, delivered: 0 };
      totals[pepId].planned += lot.quantite || 0;
      if (lot.statut === 'livre') {
        totals[pepId].delivered += lot.quantite || 0;
      }
    });

  // Fallback: use pepiniere names from the map even if no lots yet
  const result = Object.entries(totals).map(([pepId, data]) => ({
    pepId,
    pepiniere: pepMap[pepId] || pepId,
    prevu: data.planned,
    livre: data.delivered,
  }));

  // If no production lots exist, return empty to show nothing
  if (result.length === 0) return [];

  // Sort by delivery rate ascending (worst first)
  result.sort((a, b) => {
    const rateA = a.prevu > 0 ? a.livre / a.prevu : 0;
    const rateB = b.prevu > 0 ? b.livre / b.prevu : 0;
    return rateA - rateB;
  });

  return result;
};

/**
 * ComparatifLivraison Component
 */
const ComparatifLivraison = ({ lots, pepinieres }) => {
  const data = useMemo(() => computeComparatif(lots, pepinieres), [lots, pepinieres]);

  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((c) => c.prevu));

  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3699FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Comparatif — Livré vs Planifié
        </h2>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
          <span>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#E1F0FF', borderRight: '2px dashed #3699FF', marginRight: '4px', verticalAlign: 'middle' }} />
            Planifié
          </span>
          <span>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#1e1e2d', marginRight: '4px', verticalAlign: 'middle', borderRadius: '2px' }} />
            Livré
          </span>
        </div>
      </div>
      <div style={styles.body}>
        <div style={styles.barsContainer}>
          {data.map((c) => {
            const pctPrev = (c.prevu / maxVal) * 100;
            const pctReal = (c.livre / maxVal) * 100;
            const ratio = c.prevu > 0 ? (c.livre / c.prevu) * 100 : 0;

            return (
              <div key={c.pepId} style={styles.row}>
                <div style={styles.label}>
                  {c.pepiniere}
                  <span style={styles.labelSub}>
                    {c.livre.toLocaleString('fr-FR')} / {c.prevu.toLocaleString('fr-FR')} plants
                  </span>
                </div>
                <div style={styles.barWrap}>
                  <div style={{ ...styles.barPrev, width: `${pctPrev}%` }} />
                  <div style={{ ...styles.barReal, width: `${pctReal}%` }} />
                  <div style={styles.barText}>{c.livre.toLocaleString('fr-FR')}</div>
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    ...getEcartStyle(ratio),
                  }}
                >
                  {getEcartLabel(ratio)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ComparatifLivraison;
