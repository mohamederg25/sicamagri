/**
 * WorkflowView — Production Pipeline Visualization
 * ==================================================
 *
 * Displays the full production workflow as a connected pipeline:
 *   Semis → Test Germination → Production → Croissance → Récolte → Livraison
 *
 * Each stage shows:
 *   - Icon & label
 *   - Current count/status from dashboard stats
 *   - Color indicator (active/inactive/done)
 */

import { Link } from 'react-router-dom';

/* ── Stage definition ── */
const STAGES = [
  {
    id: 'fournisseur',
    icon: '🚜',
    label: 'Fournisseur',
    desc: 'Livraison des semences par le fournisseur',
    link: '/fournisseurs',
    getValue: (s) => s?.totalFournisseurs ?? 0,
    getSub: (s) => {
      const v = s?.totalFournisseurs ?? 0;
      return v > 0 ? `${v} fournisseur${v > 1 ? 's' : ''} actif${v > 1 ? 's' : ''}` : 'Aucun fournisseur';
    },
    getColor: (s) => {
      const v = s?.totalFournisseurs ?? 0;
      if (v === 0) return '#9ca3af';
      return '#B8860B';
    },
    getBg: (s) => {
      const v = s?.totalFournisseurs ?? 0;
      if (v === 0) return '#f3f4f6';
      return '#FFF8E1';
    },
    getActive: (s) => (s?.totalFournisseurs ?? 0) > 0,
  },
  {
    id: 'magazin',
    icon: '🏭',
    label: 'Magazin',
    desc: 'Réception du lot (ex. Lot A, 1000 kg)',
    link: '/stock',
    getValue: (s) => s?.totalStockEntries ?? 0,
    getSub: (s) => {
      const entries = s?.totalStockEntries ?? 0;
      const restant = s?.stockRestant ?? 0;
      const initial = s?.stockInitial ?? 0;
      const t = s?.stockUtilisation;
      if (entries === 0) return 'Aucune entrée';
      if (restant === 0 && t !== null) return `Épuisé · ${t}% utilisé`;
      if (restant === 0) return 'Épuisé';
      if (restant > 0 && t !== null) return `${restant} / ${initial} graines · ${t}% utilisé`;
      if (restant > 0) return `${restant} / ${initial} graines`;
      return 'En stock';
    },
    getColor: (s) => {
      const v = s?.stockRestant ?? 0;
      if ((s?.totalStockEntries ?? 0) === 0) return '#9ca3af';
      if (v === 0) return '#B02020';
      if ((s?.stockUtilisation ?? 0) >= 80) return '#D97706';
      return '#1565C0';
    },
    getBg: (s) => {
      const v = s?.stockRestant ?? 0;
      if ((s?.totalStockEntries ?? 0) === 0) return '#f3f4f6';
      if (v === 0) return '#FFEBEE';
      if ((s?.stockUtilisation ?? 0) >= 80) return '#FFF8E1';
      return '#E3F2FD';
    },
    getActive: (s) => (s?.totalStockEntries ?? 0) > 0,
  },
  {
    id: 'test',
    icon: '🔬',
    label: 'Tests Germination',
    desc: 'Test de germination du lot reçu',
    link: '/tests-germination',
    getValue: (s) => s?.lotsAvecTaux ?? 0,
    getSub: (s) => {
      const avg = s?.avgGermination;
      return avg !== null ? `Résultat: ${avg.toFixed(1)}%` : 'En attente';
    },
    getColor: (s) => {
      const v = s?.lotsAvecTaux ?? 0;
      if (v === 0) return '#9ca3af';
      return '#7c3aed';
    },
    getBg: (s) => {
      const v = s?.lotsAvecTaux ?? 0;
      if (v === 0) return '#f3f4f6';
      return '#ede9fe';
    },
    getActive: (s) => (s?.lotsAvecTaux ?? 0) > 0,
  },
  {
    id: 'semis',
    icon: '🌱',
    label: 'Semis',
    desc: 'Envoi du lot vers les pépinières',
    link: '/semis',
    getValue: (s) => s?.semisActifs ?? 0,
    getSub: (s) => {
      const p = s?.semisPrevus ?? 0;
      const r = s?.semisRealises ?? 0;
      return `${p} prévus · ${r} réalisés`;
    },
    getColor: (s) => {
      const v = s?.semisActifs ?? 0;
      if (v === 0) return '#9ca3af';
      return '#1e40af';
    },
    getBg: (s) => {
      const v = s?.semisActifs ?? 0;
      if (v === 0) return '#f3f4f6';
      return '#dbeafe';
    },
    getActive: (s) => (s?.semisActifs ?? 0) > 0,
  },
  {
    id: 'production',
    icon: '⚙️',
    label: 'Lots Production',
    desc: 'Lots de production créés',
    link: '/lots/production',
    getValue: (s) => s?.lotsProd ?? 0,
    getSub: (s) => {
      const v = s?.lotsProd ?? 0;
      return v > 0 ? `${s?.totalLots ?? 0} lots total` : 'Aucun lot';
    },
    getColor: (s) => {
      const v = s?.lotsProd ?? 0;
      if (v === 0) return '#9ca3af';
      return '#008030';
    },
    getBg: (s) => {
      const v = s?.lotsProd ?? 0;
      if (v === 0) return '#f3f4f6';
      return '#E8F5E9';
    },
    getActive: (s) => (s?.lotsProd ?? 0) > 0,
  },
  {
    id: 'croissance',
    icon: '🌿',
    label: 'En Croissance',
    desc: 'Suivi de croissance',
    link: '/supervision',
    getValue: (s) => s?.semisActifs ?? 0,
    getSub: (s) => {
      const v = s?.lotsProd ?? 0;
      return v > 0 ? `${v} lots actifs` : 'Aucun';
    },
    getColor: (s) => {
      const v = s?.lotsProd ?? 0;
      if (v === 0) return '#9ca3af';
      return '#008030';
    },
    getBg: (s) => {
      const v = s?.lotsProd ?? 0;
      if (v === 0) return '#f3f4f6';
      return '#E8F5E9';
    },
    getActive: (s) => (s?.lotsProd ?? 0) > 0,
  },
  {
    id: 'recolte',
    icon: '🌾',
    label: 'Récolte',
    desc: 'Récolte en cours / terminée',
    link: '/history',
    getValue: (s) => s?.totalLots ?? 0,
    getSub: (s) => {
      const avg = s?.avgGermination;
      return avg !== null ? `Germ. moy. ${avg.toFixed(1)}%` : 'Pas de données';
    },
    getColor: (s) => {
      const avg = s?.avgGermination;
      if (avg === null) return '#9ca3af';
      if (avg >= 70) return '#008030';
      if (avg >= 40) return '#8D6E00';
      return '#B02020';
    },
    getBg: (s) => {
      const avg = s?.avgGermination;
      if (avg === null) return '#f3f4f6';
      if (avg >= 70) return '#E8F5E9';
      if (avg >= 40) return '#FFF8E1';
      return '#FFEBEE';
    },
    getActive: (s) => s?.avgGermination !== null && (s?.totalLots ?? 0) > 0,
  },
  {
    id: 'livraison',
    icon: '🚚',
    label: 'Livraison',
    desc: 'Lots livrés / en transit',
    link: '/history',
    getValue: (s) => s?.lotsProd ?? 0,
    getSub: (s) => {
      const t = s?.tauxUtilisationGlobal;
      return t !== null ? `Utilisation: ${t}%` : 'Pas de données';
    },
    getColor: (s) => {
      const t = s?.tauxUtilisationGlobal;
      if (t === null) return '#9ca3af';
      if (t >= 70) return '#008030';
      if (t >= 40) return '#8D6E00';
      return '#B02020';
    },
    getBg: (s) => {
      const t = s?.tauxUtilisationGlobal;
      if (t === null) return '#f3f4f6';
      if (t >= 70) return '#E8F5E9';
      if (t >= 40) return '#FFF8E1';
      return '#FFEBEE';
    },
    getActive: (s) => s?.tauxUtilisationGlobal !== null && (s?.lotsProd ?? 0) > 0,
  },
];

/* ── Connecting Arrow ── */
const Arrow = ({ active }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      width: 28,
      color: active ? '#B02020' : '#d1d5db',
      fontSize: '18px',
      fontWeight: 300,
      userSelect: 'none',
    }}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  </div>
);

/* ── Single Stage Card ── */
const StageCard = ({ stage, stats }) => {
  const value = stage.getValue(stats);
  const sub = stage.getSub(stats);
  const color = stage.getColor(stats);
  const bg = stage.getBg(stats);
  const active = stage.getActive(stats);

  return (
    <Link
      to={stage.link}
      style={{
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        padding: '14px 12px',
        borderRadius: '12px',
        backgroundColor: bg,
        border: `2px solid ${active ? color : '#C8E6C9'}`,
        minWidth: 0,
        flex: '1 1 0',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Active pulse dot */}
      {active && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: color,
            opacity: 0.7,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}
      <span style={{ fontSize: '24px', lineHeight: 1 }}>{stage.icon}</span>
      <div
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: '#222',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {stage.label}
      </div>
      <div
        style={{
          fontSize: '22px',
          fontWeight: 800,
          color: color,
          lineHeight: 1,
          marginTop: '2px',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '10px',
          color: '#222222',
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {sub}
      </div>
    </Link>
  );
};

/* ── Summary Bar ── */
const SummaryBar = ({ stats, role }) => {
  const avgGerm = stats?.avgGermination;
  const pepCount = stats?.totalPepinieres ?? 0;
  const varCount = stats?.totalVarietes ?? 0;

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        marginTop: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '8px',
          backgroundColor: '#f9fafb',
          fontSize: '11px',
          fontWeight: 600,
          color: '#222222',
        }}
      >
         {pepCount} pépinières
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '8px',
          backgroundColor: '#f9fafb',
          fontSize: '11px',
          fontWeight: 600,
          color: '#222222',
        }}
      >
         {varCount} variétés
      </div>
      {avgGerm !== null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: avgGerm >= 70 ? '#E8F5E9' : avgGerm >= 40 ? '#FFF8E1' : '#FFEBEE',
            fontSize: '11px',
            fontWeight: 700,
            color: avgGerm >= 70 ? '#008030' : avgGerm >= 40 ? '#8D6E00' : '#B02020',
          }}
        >
           Germ. moy. {avgGerm.toFixed(1)}%
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '8px',
          backgroundColor: '#f9fafb',
          fontSize: '11px',
          fontWeight: 600,
          color: '#222222',
        }}
      >
         {stats?.totalLots ?? 0} lots
      </div>
      <Link
        to="/planning"
        style={{
          marginLeft: 'auto',
          padding: '6px 14px',
          backgroundColor: '#1A1A1A',
          color: 'white',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#333'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1A1A1A'; }}
      >
        Voir le planning →
      </Link>
    </div>
  );
};

/* ── Stage IDs allowed per role ── */
const STAGES_BY_ROLE = {
  admin: ['fournisseur', 'magazin', 'test', 'semis', 'production', 'croissance', 'recolte', 'livraison'],
  ingenieur: ['magazin', 'test', 'semis', 'production', 'croissance', 'recolte', 'livraison'],
  employe: ['semis', 'production', 'croissance', 'recolte', 'livraison'],
  visiteur: ['semis', 'production', 'recolte', 'livraison'],
};

/* ── Main WorkflowView Component ── */
const WorkflowView = ({ stats, role }) => {
  if (!stats) return null;

  // Filter stages based on user role
  const allowedIds = STAGES_BY_ROLE[role] || STAGES_BY_ROLE.visiteur;
  const visibleStages = STAGES.filter(stage => allowedIds.includes(stage.id));

  if (visibleStages.length === 0) return null;

  return (
    <div
      style={{
        padding: '16px 28px',
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      {/* Title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}
      >
        <h2
          style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#333',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B02020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Pipeline de Production
        </h2>
        <div
          style={{
            fontSize: '11px',
            color: '#111111',
            fontWeight: 500,
          }}
        >
          {role === 'admin' ? 'Vue complète' : 'Vue synthétique'}
        </div>
      </div>

      {/* Pipeline Stages */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: '0',
          backgroundColor: 'white',
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          border: '1px solid #C8E6C9',
          overflowX: 'auto',
        }}
      >
        {visibleStages.map((stage, idx) => (
          <div
            key={stage.id}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              flex: 1,
              minWidth: 0,
            }}
          >
            <StageCard stage={stage} stats={stats} />
            {idx < visibleStages.length - 1 && (
              <Arrow active={stage.getActive(stats) && visibleStages[idx + 1].getActive(stats)} />
            )}
          </div>
        ))}
      </div>

      {/* Summary Bar */}
      <SummaryBar stats={stats} role={role} />
    </div>
  );
};

export default WorkflowView;
