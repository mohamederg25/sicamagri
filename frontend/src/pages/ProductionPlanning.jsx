import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import ExportButton from '../components/ExportButton';
import lotService from '../services/lotService';
import { fmtDate, fmtNumber } from '../utils/dates';
import { Search } from 'lucide-react';
import useSort from '../hooks/useSort';

/* ── Status helpers ── */
const DB_STATUS_CFG = {
  en_cours: { label: ' En croissance', color: '#92400e', bg: '#fef3c7' },
  pret: { label: ' Prêt à récolter', color: '#006625', bg: '#dcfce7' },
  recolte: { label: ' Récolté', color: '#1565C0', bg: '#dbeafe' },
  livre: { label: '[OK] Livré', color: '#006625', bg: '#f0fdf4' },
  annule: { label: '[NOK] Annulé', color: '#991b1b', bg: '#fee2e2' },
};

const getStatus = (lot) => {
  const today = new Date();
  const min = lot.expectedReadyDateMin ? new Date(lot.expectedReadyDateMin) : null;
  const max = lot.expectedReadyDateMax ? new Date(lot.expectedReadyDateMax) : null;
  const maturityEnd = lot.maturityWindowEnd ? new Date(lot.maturityWindowEnd) : null;

  // First, check actual DB status for completed/terminal states
  if (lot.statut === 'livre') return DB_STATUS_CFG.livre;
  if (lot.statut === 'recolte') return DB_STATUS_CFG.recolte;
  if (lot.statut === 'annule') return DB_STATUS_CFG.annule;

  // If the lot has been auto-transitioned to 'pret', show that
  if (lot.statut === 'pret') return DB_STATUS_CFG.pret;

  // For 'en_cours' lots, compute status based on dates
  if (!min && !max) return { label: '[!] Non calculé', color: '#222222', bg: '#f3f4f6' };

  if (today < min) {
    // Before the ready window
    const daysLeft = Math.ceil((min - today) / (1000 * 60 * 60 * 24));
    return { label: ` En croissance (${daysLeft}j restants)`, color: '#92400e', bg: '#fef3c7' };
  }
  if (today >= min && today <= max) {
    // In the ready window — if still en_cours, it should auto-transition soon
    return { label: ' Prêt à récolter (auto)', color: '#006625', bg: '#dcfce7' };
  }
  if (maturityEnd && today <= maturityEnd) {
    const daysLeft = Math.ceil((maturityEnd - today) / (1000 * 60 * 60 * 24));
    return { label: ` Fenêtre maturité (${daysLeft}j restants)`, color: '#1e40af', bg: '#dbeafe' };
  }
  return { label: '[OK] Terminé', color: '#222222', bg: '#f3f4f6' };
};

const getProgress = (lot) => {
  const today = new Date();
  const sowing = lot.dateEntree ? new Date(lot.dateEntree) : null;
  const min = lot.expectedReadyDateMin ? new Date(lot.expectedReadyDateMin) : null;
  const max = lot.expectedReadyDateMax ? new Date(lot.expectedReadyDateMax) : null;

  if (!sowing || !min || !max) return 0;

  const total = max - sowing;
  const elapsed = today - sowing;
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  return Math.round(pct);
};



const ProductionPlanning = () => {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, classicMode } = useAuth();

  const [pepFilter, setPepFilter] = useState('all');
  const [varFilter, setVarFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLots();
  }, []);

  const fetchLots = async () => {
    try {
      setLoading(true);
      const { data } = await lotService.getAll();
      // Only production lots, sorted by expectedReadyDateMin
      const prodLots = (data || [])
        .filter(l => l.type === 'production')
        .sort((a, b) => {
          const aDate = a.expectedReadyDateMin || a.dateEntree || 0;
          const bDate = b.expectedReadyDateMin || b.dateEntree || 0;
          return new Date(aDate) - new Date(bDate);
        });
      setLots(prodLots);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique pepinieres and varietes from all production lots
  const pepinieres = [...new Map(lots.map(l => [l.semis?.pepiniere?._id, { _id: l.semis?.pepiniere?._id, nom: l.semis?.pepiniere?.nom }])).values()].filter(p => p._id).sort((a, b) => a.nom?.localeCompare(b.nom));
  const varietes = [...new Map(lots.map(l => [l.semis?.variete?._id, { _id: l.semis?.variete?._id, nom: l.semis?.variete?.nom }])).values()].filter(v => v._id).sort((a, b) => a.nom?.localeCompare(b.nom));

  // Apply filters
  const filteredLots = lots.filter(l => {
    const pepMatch = pepFilter === 'all' || l.pepiniere?._id === pepFilter;
    const varMatch = varFilter === 'all' || l.variete?._id === varFilter;
    if (!pepMatch || !varMatch) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (l.code || '').toLowerCase().includes(q) ||
      (l.semis?.variete?.nom || '').toLowerCase().includes(q) ||
      (l.semis?.pepiniere?.nom || '').toLowerCase().includes(q) ||
      (l.semis?.code || '').toLowerCase().includes(q)
    );
  });

  const { sortedData, handleSort, SortIcon } = useSort(filteredLots, { defaultField: 'code' });

  if (loading) return <Loading />;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#222222', margin: 0 }}>
          Planification Production
        </h1>
        <p style={{ fontSize: '18px', color: '#222222', margin: '8px 0 0' }}>
          Suivi des lots de production — prévisions de récolte
        </p>
      </header>

      {/* ── Filters + Search + Export ── */}
      {(pepinieres.length > 0 || varietes.length > 0) && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #C8E6C9',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#111111' }} />
            <input
              type="text"
              placeholder="Rechercher par lot, variété, pépinière..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#111111', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
              >
                ×
              </button>
            )}
          </div>

          {pepinieres.length > 0 && (
            <>
              <label style={{ fontSize: '14px', fontWeight: 600, color: '#111111' }}>Pépinière :</label>
              <select
                value={pepFilter}
                onChange={(e) => setPepFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: 'white',
                }}
              >
                <option value="all">Toutes les pépinières</option>
                {pepinieres.map(p => (
                  <option key={p._id} value={p._id}>{p.nom}</option>
                ))}
              </select>
            </>
          )}
          {varietes.length > 0 && (
            <>
              <label style={{ fontSize: '14px', fontWeight: 600, color: '#111111' }}>Variété :</label>
              <select
                value={varFilter}
                onChange={(e) => setVarFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: 'white',
                }}
              >
                <option value="all">Toutes les variétés</option>
                {varietes.map(v => (
                  <option key={v._id} value={v._id}>{v.nom}</option>
                ))}
              </select>
            </>
          )}
<ExportButton
            user={user}
            filename="planification-production"
            columns={[{ accessor: 'code', header: 'Lot' }, { accessor: 'semis.variete.nom', header: 'Variété' }, { accessor: 'quantite', header: 'Plants' }, { accessor: 'dateEntree', header: 'Semis' }, { accessor: 'expectedReadyDateMin', header: 'Prêt min' }, { accessor: 'expectedReadyDateMax', header: 'Prêt max' }, { accessor: 'maturityWindowEnd', header: 'Fin maturité' }]}
            data={filteredLots}
            mapRow={(lot) => [lot.code || '-', lot.semis?.variete?.nom || '-', lot.quantite?.toString() || '-', lot.dateEntree ? fmtDate(lot.dateEntree) : '-', lot.expectedReadyDateMin ? fmtDate(lot.expectedReadyDateMin) : '-', lot.expectedReadyDateMax ? fmtDate(lot.expectedReadyDateMax) : '-', lot.maturityWindowEnd ? fmtDate(lot.maturityWindowEnd) : '-']}
          />
          <span style={{ fontSize: '13px', color: '#111111', marginLeft: 'auto' }}>
            {filteredLots.length} lot{filteredLots.length > 1 ? 's' : ''} affiché{filteredLots.length > 1 ? 's' : ''}
          </span>
        </div>
      )}



      {/* ── Harvest Calendar (Gantt Chart) ── */}
      {filteredLots.length > 0 && (() => {
        const today = new Date();

        // Compute date range (earliest sowing → latest maturity end, padded)
        let minDate = Infinity;
        let maxDate = -Infinity;
        filteredLots.forEach(l => {
          if (l.dateEntree) { const d = new Date(l.dateEntree); if (d < minDate) minDate = d; }
          if (l.expectedReadyDateMin) { const d = new Date(l.expectedReadyDateMin); if (d < minDate) minDate = d; }
          if (l.expectedReadyDateMax) { const d = new Date(l.expectedReadyDateMax); if (d > maxDate) maxDate = d; }
          if (l.maturityWindowEnd) { const d = new Date(l.maturityWindowEnd); if (d > maxDate) maxDate = d; }
        });
        if (minDate === Infinity || maxDate === -Infinity) return null;

        // Pad by 1 month on each side
        const start = new Date(minDate);
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        const end = new Date(maxDate);
        end.setMonth(end.getMonth() + 2);
        end.setDate(0); // Last day of previous month

        const totalDays = (end - start) / (1000 * 60 * 60 * 24);
        if (totalDays <= 0) return null;

        const toX = (date) => {
          const d = new Date(date);
          const days = (d - start) / (1000 * 60 * 60 * 24);
          return Math.max(0, Math.min(totalDays, days));
        };

        // Month labels
        const months = [];
        let cursor = new Date(start);
        while (cursor < end) {
          months.push(new Date(cursor));
          cursor.setMonth(cursor.getMonth() + 1);
        }

        const rowHeight = 76;
        const headerHeight = 56;
        const labelWidth = 380;

        // Compute chart width (at least full, with scroll)
        const chartWidth = Math.max(1400, totalDays * 8); // 8px per day

        return (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #C8E6C9',
            borderRadius: '20px',
            padding: '32px',
            marginBottom: '32px',
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>                          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#222222', margin: 0 }}>
                             Calendrier de récolte
                          </h2>
                          <div style={{ display: 'flex', gap: '28px', fontSize: '16px', color: '#222222' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '28px', height: '18px', borderRadius: '5px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'inline-block' }} />
                  <span style={{ fontWeight: 700 }}>Croissance</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '28px', height: '18px', borderRadius: '5px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'inline-block' }} />
                  <span style={{ fontWeight: 700 }}>Fenêtre de maturité</span>
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div style={{ position: 'relative', width: `${labelWidth + chartWidth}px` }}>
                {/* ── Month header ── */}
                <div style={{ marginLeft: `${labelWidth}px`, height: `${headerHeight}px`, position: 'relative', marginBottom: '6px' }}>
                  {months.map((m, i) => {
                    const x = toX(m);
                    const isEven = i % 2 === 0;
                    return (
                      <div key={i} style={{
                        position: 'absolute',
                        left: `${(x / totalDays) * chartWidth}px`,
                        top: '6px',
                        fontSize: '17px',
                        fontWeight: 700,
                        color: isEven ? '#1f2937' : '#9ca3af',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.02em',
                      }}>
                        {m.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                      </div>
                    );
                  })}
                  {/* Today line label */}
                  {today >= start && today <= end && (
                    <div style={{
                      position: 'absolute',
                      left: `${(toX(today) / totalDays) * chartWidth}px`,
                      top: '2px',
                      fontSize: '15px',
                      fontWeight: 800,
                      color: '#B02020',
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap',
                      background: '#fef2f2',
                      padding: '6px 18px',
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      zIndex: 20,
                      boxShadow: '0 3px 12px rgba(176,32,32,0.2)',
                    }}>
                      Aujourd'hui
                    </div>
                  )}
                </div>

                {/* ── Grid rows ── */}
                {filteredLots.map((lot, idx) => {
                  const sowing = lot.dateEntree ? new Date(lot.dateEntree) : null;
                  const readyMin = lot.expectedReadyDateMin ? new Date(lot.expectedReadyDateMin) : null;
                  const readyMax = lot.expectedReadyDateMax ? new Date(lot.expectedReadyDateMax) : null;
                  const maturityEnd = lot.maturityWindowEnd ? new Date(lot.maturityWindowEnd) : null;

                  const sowingX = sowing ? (toX(sowing) / totalDays) * chartWidth : null;
                  const readyMinX = readyMin ? (toX(readyMin) / totalDays) * chartWidth : 0;
                  const readyMaxX = readyMax ? (toX(readyMax) / totalDays) * chartWidth : 0;
                  const maturityEndX = maturityEnd ? (toX(maturityEnd) / totalDays) * chartWidth : 0;

                  const top = idx * rowHeight;

                  return (
                    <div key={lot._id} style={{ position: 'relative', height: `${rowHeight}px` }}>
                      {/* Lot label */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: '2px',
                        width: `${labelWidth - 12}px`,
                        height: `${rowHeight - 4}px`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        paddingLeft: '8px',
                        overflow: 'hidden',
                      }}>
                        <span style={{ fontSize: '24px', fontWeight: 800, color: '#006625', fontFamily: 'monospace', whiteSpace: 'nowrap', letterSpacing: '-0.5px' }}>
                          {lot.code}
                        </span>                          <span style={{ fontSize: '18px', fontWeight: 500, color: '#222222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={lot.semis?.variete?.nom}>
                          {lot.semis?.variete?.nom}
                        </span>
                      </div>

                      {/* Background row */}
                      <div style={{
                        position: 'absolute',
                        left: `${labelWidth}px`,
                        top: 0,
                        width: `${chartWidth}px`,
                        height: `${rowHeight - 4}px`,
                        backgroundColor: idx % 2 === 0 ? '#fafafa' : 'white',
                        borderRadius: '4px',
                      }} />

                      {/* Croissance segment (sowing → readyMax) */}
                      {sowingX !== null && sowing && readyMax && (
                        <div style={{
                          position: 'absolute',
                          left: `${labelWidth + sowingX}px`,
                          top: '8px',
                          width: `${Math.max(10, readyMaxX - sowingX)}px`,
                          height: `${rowHeight - 16}px`,
                          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                          borderRadius: maturityEnd ? '10px 0 0 10px' : '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '17px',
                          fontWeight: 700,
                          color: 'white',
                          textShadow: '0 1px 3px rgba(0,0,0,0.25)',
                          minWidth: '10px',
                          overflow: 'hidden',
                          boxShadow: '0 3px 8px rgba(34,197,94,0.35)',
                        }}>
                          {readyMaxX - sowingX > 40 ? `${lot.quantite} plants` : ''}
                        </div>
                      )}

                      {/* Fenêtre de maturité segment (readyMax → maturityEnd) */}
                      {readyMax && maturityEnd && (
                        <div style={{
                          position: 'absolute',
                          left: `${labelWidth + readyMaxX}px`,
                          top: '8px',
                          width: `${Math.max(6, maturityEndX - readyMaxX)}px`,
                          height: `${rowHeight - 16}px`,
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          borderRadius: '0 10px 10px 0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 700,
                          color: 'white',
                          textShadow: '0 1px 3px rgba(0,0,0,0.25)',
                          minWidth: '6px',
                          boxShadow: '0 3px 8px rgba(245,158,11,0.35)',
                        }} />
                      )}
                    </div>
                  );
                })}

                {/* ── Today vertical line ── */}
                {today >= start && today <= end && (
                  <div style={{
                    position: 'absolute',
                    left: `${labelWidth + (toX(today) / totalDays) * chartWidth}px`,
                    top: `${headerHeight}px`,
                    width: '4px',
                    height: `${filteredLots.length * rowHeight}px`,
                    background: 'linear-gradient(to bottom, #B02020, #ef4444)',
                    zIndex: 10,
                    opacity: 0.85,
                    pointerEvents: 'none',
                    boxShadow: '0 0 12px rgba(176,32,32,0.5)',
                  }} />
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Table ── */}
      <div className={classicMode ? 'classic-table' : ''} style={{
        backgroundColor: 'white',
        border: '1px solid #C8E6C9',
        borderRadius: '16px',
        overflow: 'hidden',
      }}>
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th scope="col" onClick={() => handleSort('code')} style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Lot<SortIcon field="code" /></th>
                <th scope="col" onClick={() => handleSort('variete.nom')} style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Variété<SortIcon field="variete.nom" /></th>
                <th scope="col" onClick={() => handleSort('quantite')} style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Plants<SortIcon field="quantite" /></th>
                <th scope="col" onClick={() => handleSort('semis.code')} style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Semis<SortIcon field="semis.code" /></th>
                <th scope="col" style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>Prêt (min → max)</th>
                <th scope="col" onClick={() => handleSort('maturityWindowEnd')} style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Fin maturité<SortIcon field="maturityWindowEnd" /></th>
                <th scope="col" style={{ textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>Progression</th>
                <th scope="col" onClick={() => handleSort('statut')} style={{ cursor: 'pointer', textAlign: 'center', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Statut<SortIcon field="statut" /></th>
                <th scope="col" style={{ textAlign: 'right', padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? sortedData.map((lot) => {
                const status = getStatus(lot);
                const progress = getProgress(lot);
                return (
                  <tr key={lot._id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <td style={{ padding: '18px 20px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 600, color: '#006625', fontFamily: 'monospace' }}>{lot.code || '—'}</span>
                    </td>
                    <td style={{ padding: '18px 20px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 600, color: '#222222' }}>{lot.semis?.variete?.nom}</span>
                    </td>
                    <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: '#1f2937' }}>{fmtNumber(lot.quantite)}</span>
                    </td>
                    <td style={{ padding: '18px 20px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: '#006625', fontFamily: 'monospace' }}>{lot.semis?.code || '—'}</span>
                    </td>
                    <td style={{ padding: '18px 20px' }}>
                      {lot.expectedReadyDateMin && lot.expectedReadyDateMax ? (
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>
                          {fmtDate(lot.expectedReadyDateMin)} → {fmtDate(lot.expectedReadyDateMax)}
                        </span>
                      ) : (
                        <span style={{ fontSize: '14px', color: '#111111', fontStyle: 'italic' }}>Non calculé</span>
                      )}
                    </td>
                    <td style={{ padding: '18px 20px' }}>
                      {lot.maturityWindowEnd ? (
                        <span style={{ fontSize: '15px', color: '#222222' }}>{fmtDate(lot.maturityWindowEnd)}</span>
                      ) : (
                        <span style={{ fontSize: '14px', color: '#111111', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '18px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          flex: 1,
                          height: '8px',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          minWidth: '60px',
                        }}>
                          <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            backgroundColor: progress >= 100 ? '#6b7280' : progress >= 80 ? '#1e40af' : progress >= 50 ? '#006625' : '#92400e',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#222222', minWidth: '30px' }}>{progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '18px 20px' }}>
                      <span style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        backgroundColor: status.bg,
                        color: status.color,
                      }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                      <Link
                        to={`/lots/${lot._id}`}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: '#008030',
                          color: 'white',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 500,
                          textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Détails
                      </Link>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="9" style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '18px', color: '#111111', margin: 0 }}>Aucun lot de production trouvé</p>
                    <p style={{ fontSize: '14px', color: '#d1d5db', margin: '8px 0 0' }}>
                      {pepFilter !== 'all' || varFilter !== 'all' || searchTerm ? 'Essayez de modifier les filtres.' : 'Créez un lot de production pour voir les prévisions de récolte.'}
                    </p>
                    {(pepFilter === 'all' && varFilter === 'all' && (user?.role === 'admin' || user?.role === 'ingenieur')) && (
                      <Link
                        to="/lots/new/production"
                        style={{
                          display: 'inline-block',
                          marginTop: '16px',
                          padding: '12px 24px',
                          backgroundColor: '#008030',
                          color: 'white',
                          borderRadius: '10px',
                          fontSize: '15px',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        Nouveau lot de production
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Résumé des prochaines récoltes ── */}
      {filteredLots.filter(l => getStatus(l).label.includes('Prêt') || getStatus(l).label.includes('Fenêtre')).length > 0 && (
        <div style={{ marginTop: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '20px 24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#006625', margin: '0 0 12px' }}>
             Prochaines récoltes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredLots
              .filter(l => getStatus(l).label.includes('Prêt') || getStatus(l).label.includes('Fenêtre'))
              .sort((a, b) => new Date(a.expectedReadyDateMin) - new Date(b.expectedReadyDateMin))
              .slice(0, 5)
              .map(lot => (
                <div key={lot._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                  <div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#006625', fontSize: '15px' }}>{lot.code}</span>
                    <span style={{ color: '#111111', fontSize: '14px', marginLeft: '8px' }}>{lot.semis?.variete?.nom}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{fmtNumber(lot.quantite)} plants</span>
                    <span style={{ fontSize: '14px', color: '#222222' }}>
                      {fmtDate(lot.expectedReadyDateMin)} → {fmtDate(lot.expectedReadyDateMax)}
                    </span>
                    <Link to={`/lots/${lot._id}`} style={{ fontSize: '13px', fontWeight: 600, color: '#006625', textDecoration: 'none' }}>
                      Voir →
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionPlanning;
