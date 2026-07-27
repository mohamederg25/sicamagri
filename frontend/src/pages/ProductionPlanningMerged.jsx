/**
 * ProductionPlanningMerged — Production & Planification (merged)
 * ==============================================================
 *
 * Merged view combining the essential elements from:
 *   - Production page (ActivityLog) — KPIs, pipeline, upcoming harvests
 *   - Planification page (ProductionPlanning) — progress, dates, semis code
 *
 * Features:
 *   - KPI cards: lots by status, plants produced/delivered
 *   - Pipeline visualization: en_cours → pret → recolte → livre
 *   - Upcoming harvests (30 days)
 *   - Filterable/sortable lots table with progress, dates, status
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import ExportButton from '../components/ExportButton';
import { Search, Sprout, CheckCircle, Wheat, Truck, Calendar, ClipboardList, ChevronRight, ChevronLeft } from 'lucide-react';
import useSort from '../hooks/useSort';
import lotService from '../services/lotService';
import { fmtDate, fmtNumber } from '../utils/dates';

const LOT_STATUS = {
  en_cours: { label: 'En croissance', bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: 'en_cours' },
  pret:     { label: 'Prêt',          bg: '#dcfce7', color: '#006625', border: '#a7f3d0', icon: 'pret' },
  recolte:  { label: 'Récolté',       bg: '#dbeafe', color: '#1565C0', border: '#93c5fd', icon: 'recolte' },
  livre:    { label: 'Livré',          bg: '#f0fdf4', color: '#006625', border: '#a7f3d0', icon: 'livre' },
  annule:   { label: 'Annulé',         bg: '#fee2e2', color: '#991b1b', border: '#fecaca', icon: 'annule' },
};

const PIPELINE = ['en_cours', 'pret', 'recolte', 'livre'];

const StatusIcon = ({ icon }) => {
  switch (icon) {
    case 'en_cours': return <Sprout size={14} />;
    case 'pret': return <CheckCircle size={14} />;
    case 'recolte': return <Wheat size={14} />;
    case 'livre': return <Truck size={14} />;
    default: return null;
  }
};

const getProgress = (lot) => {
  const today = new Date();
  const sowing = lot.dateEntree ? new Date(lot.dateEntree) : null;
  const min = lot.expectedReadyDateMin ? new Date(lot.expectedReadyDateMin) : null;
  const max = lot.expectedReadyDateMax ? new Date(lot.expectedReadyDateMax) : null;
  if (!sowing || !min || !max) return 0;
  const total = max - sowing;
  const elapsed = today - sowing;
  return Math.round(Math.min(100, Math.max(0, (elapsed / total) * 100)));
};

const ProductionPlanningMerged = () => {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [pepFilter, setPepFilter] = useState('all');
  const [varFilter, setVarFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { user, classicMode } = useAuth();

  const fetchLots = async () => {
    try {
      setLoading(true);
      const { data } = await lotService.getAll();
      const prodLots = (data || []).filter(l => l.type === 'production');
      setLots(prodLots);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
  }, []);

  // ── Derived filter options ──
  const pepinieres = useMemo(
    () => [...new Map(lots.map(l => [l.semis?.pepiniere?._id, { _id: l.semis?.pepiniere?._id, nom: l.semis?.pepiniere?.nom }])).values()].filter(p => p._id),
    [lots]
  );
  const varietes = useMemo(
    () => [...new Map(lots.map(l => [l.semis?.variete?._id, { _id: l.semis?.variete?._id, nom: l.semis?.variete?.nom }])).values()].filter(v => v._id),
    [lots]
  );

  // ── Status breakdown ──
  const statusCounts = useMemo(() => {
    const counts = { en_cours: 0, pret: 0, recolte: 0, livre: 0, annule: 0 };
    lots.forEach(l => { if (counts[l.statut] !== undefined) counts[l.statut]++; });
    return counts;
  }, [lots]);

  // ── Stats ──
  const stats = useMemo(() => ({
    totalRecords: lots.length,
    totalPlants: lots.reduce((s, l) => s + (l.nombrePlantsProduits || 0), 0),
    totalLivrees: lots.reduce((s, l) => s + (l.quantiteLivree || 0), 0),
  }), [lots]);

  // ── Upcoming harvests (30 days) ──
  const upcomingHarvests = useMemo(() => {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return lots
      .filter(l => {
        if (l.statut !== 'en_cours' && l.statut !== 'pret') return false;
        if (!l.expectedReadyDateMin) return false;
        const d = new Date(l.expectedReadyDateMin);
        return d >= now && d <= thirtyDays;
      })
      .sort((a, b) => new Date(a.expectedReadyDateMin) - new Date(b.expectedReadyDateMin))
      .slice(0, 8);
  }, [lots]);

  // ── Filtered lots ──
  const filtered = useMemo(() => {
    return lots.filter(l => {
      const pepMatch = pepFilter === 'all' || l.semis?.pepiniere?._id === pepFilter;
      const varMatch = varFilter === 'all' || l.semis?.variete?._id === varFilter;
      const statusMatch = statusFilter === 'all' || l.statut === statusFilter;
      if (!pepMatch || !varMatch || !statusMatch) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        (l.code || '').toLowerCase().includes(q) ||
        (l.semis?.variete?.nom || '').toLowerCase().includes(q) ||
        (l.semis?.pepiniere?.nom || '').toLowerCase().includes(q) ||
        (l.semis?.code || '').toLowerCase().includes(q)
      );
    });
  }, [lots, searchTerm, pepFilter, varFilter, statusFilter]);

  const { sortedData, handleSort, SortIcon } = useSort(filtered, { defaultField: 'code' });

  // ── Calendar state ──
  const todayStr = new Date().toISOString().split('T')[0];
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalDay, setSelectedCalDay] = useState(null);

  const prevMonth = () => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Build a map: "YYYY-MM-DD" -> array of lots ready on that day
  const readyDateMap = useMemo(() => {
    const map = {};
    lots.forEach(l => {
      const min = l.expectedReadyDateMin ? new Date(l.expectedReadyDateMin) : null;
      const max = l.expectedReadyDateMax ? new Date(l.expectedReadyDateMax) : null;
      if (!min || !max) return;
      // Iterate through each day in the ready range
      const cursor = new Date(min);
      cursor.setHours(12, 0, 0, 0);
      const end = new Date(max);
      end.setHours(12, 0, 0, 0);
      while (cursor <= end) {
        const key = cursor.toISOString().split('T')[0];
        if (!map[key]) map[key] = [];
        map[key].push({ _id: l._id, code: l.code, variete: l.semis?.variete?.nom, statut: l.statut, quantite: l.quantite });
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [lots]);

  // Calendar grid for current month
  const calendarGrid = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first

    const cells = [];
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const lotsReady = readyDateMap[dateStr] || [];
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedCalDay;
      cells.push({ day: d, dateStr, lotsReady, count: lotsReady.length, isToday, isSelected });
    }
    return cells;
  }, [calendarDate, readyDateMap, selectedCalDay, todayStr]);

  // Lots ready on the selected day
  const selectedDayLots = selectedCalDay ? (readyDateMap[selectedCalDay] || []) : [];

  if (loading) return <Loading />;

  const selectStyle = {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    background: 'white',
    color: '#111',
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Animation keyframes (stable, defined once) */}
      <style>{`
        @keyframes calFadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ═══ Header ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#222', margin: 0 }}>
            <Sprout size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '10px', color: '#008030' }} />
            Production
          </h1>
          <p style={{ fontSize: '18px', color: '#222', margin: '4px 0 0' }}>
            Planification et suivi — du semis à la livraison
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'ingenieur') && (
          <Link
            to="/lots/new/production"
            style={{
              padding: '12px 24px', backgroundColor: '#008030', color: 'white',
              borderRadius: '10px', fontSize: '15px', fontWeight: 600,
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}
          >
            + Nouveau lot
          </Link>
        )}
      </div>

      {/* ═══ KPI Cards ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <div style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '1px solid #C8E6C9', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#222', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#222' }}>{stats.totalRecords}</div>
        </div>
        <div style={{ background: '#fef3c7', borderRadius: '10px', padding: '16px', border: '1px solid #fde68a', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}><Sprout size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Croissance</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#92400e' }}>{statusCounts.en_cours}</div>
        </div>
        <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '16px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#006625', textTransform: 'uppercase', letterSpacing: '0.5px' }}><CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Prêts</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#006625' }}>{statusCounts.pret}</div>
        </div>
        <div style={{ background: '#dbeafe', borderRadius: '10px', padding: '16px', border: '1px solid #93c5fd', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#1565C0', textTransform: 'uppercase', letterSpacing: '0.5px' }}><Wheat size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Récoltés</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#1565C0' }}>{statusCounts.recolte}</div>
        </div>
        <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '16px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#006625', textTransform: 'uppercase', letterSpacing: '0.5px' }}><Truck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />Livrés</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#006625' }}>{statusCounts.livre}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '1px solid #C8E6C9', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#222', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plants produits</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#008030' }}>{fmtNumber(stats.totalPlants)}</div>
        </div>
        <div style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '1px solid #C8E6C9', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#222', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantité livrée</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#008030' }}>{fmtNumber(stats.totalLivrees)}</div>
        </div>
      </div>

      {/* ═══ Pipeline ═══ */}
      {lots.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9', padding: '18px 20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#222', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={16} color="#008030" />
            Pipeline de production
          </h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            {PIPELINE.map((step, idx) => {
              const cfg = LOT_STATUS[step];
              const count = statusCounts[step];
              const pct = lots.length > 0 ? Math.round((count / lots.length) * 100) : 0;
              return (
                <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    width: '100%', height: '32px', borderRadius: '8px',
                    backgroundColor: cfg.bg, border: `2px solid ${cfg.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    {idx > 0 && (
                      <div style={{
                        position: 'absolute', left: '-5px', top: '50%', transform: 'translateY(-50%) rotate(45deg)',
                        width: '8px', height: '8px', borderTop: `2px solid ${cfg.border}`,
                        borderRight: `2px solid ${cfg.border}`, backgroundColor: 'white', zIndex: 1,
                      }} />
                    )}
                    <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.color, zIndex: 2, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <StatusIcon icon={cfg.icon} /> {count}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#222' }}>{cfg.label}</span>
                  <span style={{ fontSize: '10px', color: '#111' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Calendrier de disponibilité — version améliorée ═══ */}
      {lots.filter(l => l.expectedReadyDateMin).length > 0 && (
        <div style={{
          background: 'linear-gradient(145deg, #ffffff 0%, #fafdfa 100%)',
          borderRadius: '16px',
          border: '1px solid #C8E6C9',
          boxShadow: '0 4px 20px rgba(0,128,48,0.06)',
          padding: '22px 24px',
          marginBottom: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle decorative top accent */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
            background: 'linear-gradient(90deg, #008030, #4ade80, #008030)',
            opacity: 0.5,
          }} />

          {/* ── Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                backgroundColor: '#f0fdf4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid #bbf7d0',
              }}>
                <Calendar size={18} color="#008030" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111', margin: 0 }}>
                  Calendrier de disponibilité
                </h3>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>
                  {Object.keys(readyDateMap).length} jours avec des lots prêts
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={prevMonth}
                title="Mois précédent"
                style={{
                  width: '34px', height: '34px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#374151', backgroundColor: 'white',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f9fafb'; e.currentTarget.style.borderColor = '#008030'; e.currentTarget.style.color = '#008030'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
              >
                <ChevronLeft size={16} />
              </button>

              <div style={{
                minWidth: '140px', textAlign: 'center',
                padding: '4px 12px', borderRadius: '8px',
                backgroundColor: '#f9fafb',
              }}>
                <span style={{
                  fontSize: '15px', fontWeight: 800, color: '#1f2937',
                  textTransform: 'capitalize',
                }}>
                  {calendarDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </span>
              </div>

              <button
                onClick={nextMonth}
                title="Mois suivant"
                style={{
                  width: '34px', height: '34px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#374151', backgroundColor: 'white',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f9fafb'; e.currentTarget.style.borderColor = '#008030'; e.currentTarget.style.color = '#008030'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* ── Day headers ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px',
            marginBottom: '8px', padding: '0 2px',
          }}>
            {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((d, idx) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: '11px', fontWeight: 700,
                color: idx >= 5 ? '#B02020' : '#6b7280',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '6px 0 4px',
              }}>{d}</div>
            ))}
          </div>

          {/* ── Calendar grid ── */}
          {(() => {
            // Pre-compute max count once for heatmap intensity
            const maxCount = Math.max(1, ...calendarGrid.filter(c => c).map(c => c.count));

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', padding: '0 2px' }}>
                {calendarGrid.map((cell, i) => {
                  if (!cell) {
                    return <div key={`e-${i}`} style={{ aspectRatio: '1' }} />;
                  }

                  // Heatmap: predefined green stops, not raw rgb math
                  const intensity = cell.count > 0 ? Math.min(1, cell.count / maxCount) : 0;
                  const heatBg =
                    cell.count === 0 ? 'transparent'
                    : intensity >= 0.8 ? '#4ade80'
                    : intensity >= 0.5 ? '#86efac'
                    : intensity >= 0.3 ? '#bbf7d0'
                    : '#dcfce7';
                  const isWeekend = (i % 7) >= 5; // sat/sun indices after empty cells

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedCalDay(cell.isSelected ? null : cell.dateStr)}
                  title={cell.count > 0
                    ? `${cell.count} lot${cell.count > 1 ? 's' : ''} prêt${cell.count > 1 ? 's' : ''} • ${cell.count === 1 ? 'Cliquez pour voir' : 'Cliquez pour voir les détails'}`
                    : 'Aucun lot prévu'}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: cell.isToday || cell.isSelected ? 800 : cell.count > 0 ? 600 : 400,
                    cursor: cell.count > 0 ? 'pointer' : 'default',
                    backgroundColor: cell.isSelected
                      ? '#006625'
                      : cell.count > 0
                        ? heatBg
                        : isWeekend ? '#f9fafb' : 'transparent',
                    color: cell.isSelected
                      ? '#fff'
                      : cell.isToday
                        ? '#B02020'
                        : cell.count > 0
                          ? '#004d1a'
                          : isWeekend ? '#6b7280' : '#6b7280',
                    border: cell.isToday && !cell.isSelected
                      ? '2px solid #B02020'
                      : cell.count > 0 && !cell.isSelected
                        ? '1px solid transparent'
                        : '1px solid transparent',
                    boxShadow: cell.isSelected
                      ? '0 4px 12px rgba(0,128,48,0.3)'
                      : cell.count > 0
                        ? '0 1px 3px rgba(0,128,48,0.08)'
                        : 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    transform: cell.isSelected ? 'scale(1.05)' : 'scale(1)',
                  }}
                  onMouseEnter={e => {
                    if (cell.count > 0 && !cell.isSelected) {
                      e.currentTarget.style.transform = 'scale(1.08)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,128,48,0.15)';
                      e.currentTarget.style.borderColor = '#008030';
                    }
                  }}
                  onMouseLeave={e => {
                    if (cell.count > 0 && !cell.isSelected) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,128,48,0.08)';
                      e.currentTarget.style.borderColor = 'transparent';
                    }
                  }}
                >
                  <span style={{
                    fontSize: cell.isToday ? '15px' : '14px',
                    lineHeight: 1,
                    position: 'relative',
                    zIndex: 1,
                  }}>
                    {cell.day}
                  </span>
                  {cell.count > 0 && (
                    <div style={{
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      position: 'relative',
                      zIndex: 1,
                    }}>
                      {/* Mini dots showing intensity */}
                      {cell.count <= 3 ? (
                        Array.from({ length: cell.count }).map((_, idx) => (
                          <span key={idx} style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            backgroundColor: cell.isSelected ? '#fff' : '#008030',
                            opacity: 0.9,
                          }} />
                        ))
                      ) : (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          color: cell.isSelected ? 'rgba(255,255,255,0.9)' : '#008030',
                          lineHeight: 1,
                        }}>
                          {cell.count}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Small intensity bar at bottom for busy days */}
                  {cell.count > 2 && (
                    <div style={{
                      position: 'absolute', bottom: '3px', left: '25%', right: '25%',
                      height: '2px', borderRadius: '1px',
                      backgroundColor: cell.isSelected
                        ? 'rgba(255,255,255,0.5)'
                        : intensity >= 0.8 ? '#008030' : intensity >= 0.5 ? '#4ade80' : '#bbf7d0',
                      opacity: 0.6,
                    }} />
                  )}
                </div>
              );
            })}
              </div>
            );
          })()}

          {/* ── Legend compacte ── */}
          <div style={{
            display: 'flex', gap: '20px', marginTop: '14px',
            fontSize: '11px', color: '#6b7280',
            justifyContent: 'center', flexWrap: 'wrap',
            padding: '8px 12px', borderRadius: '8px',
            backgroundColor: '#f9fafb',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#dcfce7', border: '1px solid #bbf7d0', display: 'inline-block' }} />
              Peu de lots
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: '#86efac', border: '1px solid #4ade80', display: 'inline-block' }} />
              Plusieurs lots
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#006625', display: 'inline-block' }} />
              Sélectionné
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #B02020', display: 'inline-block' }} />
              Aujourd'hui
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', display: 'inline-block' }} />
              Weekend
            </span>
          </div>

          {/* ── Selected day details — panel animé ── */}
          {selectedDayLots.length > 0 && (
            <div style={{
              marginTop: '16px',
              padding: '16px 18px',
              borderRadius: '12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              animation: 'calFadeInUp 0.25s ease',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '10px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#006625', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={15} />
                  Lots disponibles le{' '}
                  <span style={{ fontWeight: 800, backgroundColor: '#fff', padding: '2px 10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    {new Date(selectedCalDay + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 700, color: 'white',
                  backgroundColor: '#006625', padding: '3px 10px', borderRadius: '20px',
                }}>
                  {selectedDayLots.length} lot{selectedDayLots.length > 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedDayLots.map((lot, idx) => (
                  <Link key={lot._id} to={`/lots/${lot._id}`} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 12px', borderRadius: '8px',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    textDecoration: 'none',
                    fontSize: '12px',
                    transition: 'all 0.15s',
                    animation: `fadeInUp 0.2s ease ${idx * 0.03}s both`,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#008030'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,128,48,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <span style={{
                      fontFamily: 'monospace', fontWeight: 700, color: '#006625',
                      fontSize: '13px', flexShrink: 0,
                    }}>
                      {lot.code}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ color: '#374151', fontWeight: 600 }}>{lot.variete || '—'}</span>
                    </div>
                    {lot.quantite ? (
                      <span style={{ color: '#111', fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {lot.quantite} plants
                      </span>
                    ) : null}
                    <span style={{
                      padding: '3px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 600,
                      backgroundColor: LOT_STATUS[lot.statut]?.bg || '#f3f4f6',
                      color: LOT_STATUS[lot.statut]?.color || '#111',
                      border: `1px solid ${LOT_STATUS[lot.statut]?.border || '#e5e7eb'}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {LOT_STATUS[lot.statut]?.label || lot.statut}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Pied: résumé rapide ── */}
          {!selectedCalDay && (
            <div style={{
              marginTop: '12px',
              display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap',
              fontSize: '11px', color: '#6b7280',
            }}>
              {PIPELINE.filter(s => statusCounts[s] > 0).map(s => {
                const cfg = LOT_STATUS[s];
                return (
                  <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <StatusIcon icon={cfg.icon} />
                    <span style={{ fontWeight: 600, color: cfg.color }}>{statusCounts[s]}</span>
                    <span>{cfg.label.toLowerCase()}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ Upcoming Harvests ═══ */}
      {upcomingHarvests.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9', padding: '18px 20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#222', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="#1565C0" />
            Prochaines récoltes (30 jours)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {upcomingHarvests.map(lot => {
              const cfg = LOT_STATUS[lot.statut] || LOT_STATUS.en_cours;
              const daysUntil = Math.ceil((new Date(lot.expectedReadyDateMin) - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <Link key={lot._id} to={`/lots/${lot._id}`} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px', borderRadius: '8px',
                  border: '1px solid #e5e7eb', textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f9fafb'; e.currentTarget.style.borderColor = '#C8E6C9'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    backgroundColor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <StatusIcon icon={cfg.icon} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#006625', fontFamily: 'monospace' }}>{lot.code}</div>
                    <div style={{ fontSize: '11px', color: '#222' }}>{lot.semis?.variete?.nom || '—'} — {lot.semis?.pepiniere?.nom || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: daysUntil <= 7 ? '#B02020' : '#006625' }}>
                      {daysUntil <= 0 ? "Aujourd'hui" : `J-${daysUntil}`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#111' }}>{fmtDate(lot.expectedReadyDateMin)}</div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap' }}>
                    {cfg.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Filters + Export ═══ */}
      <div style={{
        backgroundColor: 'white', border: '1px solid #C8E6C9', borderRadius: '12px',
        padding: '14px 18px', marginBottom: '16px',
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '160px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#111' }} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 36px',
              border: '1px solid #d1d5db', borderRadius: '8px',
              fontSize: '13px', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#111', cursor: 'pointer', fontSize: '14px' }}>
              ×
            </button>
          )}
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="all">Tous statuts</option>
          <option value="en_cours">En croissance</option>
          <option value="pret">Prêt</option>
          <option value="recolte">Récolté</option>
          <option value="livre">Livré</option>
          <option value="annule">Annulé</option>
        </select>
        <select value={pepFilter} onChange={e => setPepFilter(e.target.value)} style={selectStyle}>
          <option value="all">Toutes pépinières</option>
          {pepinieres.map(p => <option key={p._id} value={p._id}>{p.nom}</option>)}
        </select>
        <select value={varFilter} onChange={e => setVarFilter(e.target.value)} style={selectStyle}>
          <option value="all">Toutes variétés</option>
          {varietes.map(v => <option key={v._id} value={v._id}>{v.nom}</option>)}
        </select>
        <ExportButton
          user={user}
          filename="production"
          columns={[
            { accessor: 'code', header: 'Lot' },
            { accessor: 'semis.code', header: 'Semis' },
            { accessor: 'semis.variete.nom', header: 'Variété' },
            { accessor: 'semis.pepiniere.nom', header: 'Pépinière' },
            { accessor: 'quantite', header: 'Plants' },
            { accessor: 'statut', header: 'Statut' },
            { accessor: 'expectedReadyDateMin', header: 'Prêt min' },
            { accessor: 'expectedReadyDateMax', header: 'Prêt max' },
            { accessor: 'dateRecolte', header: 'Récolte' },
            { accessor: 'dateLivraison', header: 'Livraison' },
          ]}
          data={filtered}
          mapRow={l => [
            l.code || '-',
            l.semis?.code || '-',
            l.semis?.variete?.nom || '-',
            l.semis?.pepiniere?.nom || '-',
            l.quantite?.toString() || '-',
            LOT_STATUS[l.statut]?.label || l.statut || '-',
            l.expectedReadyDateMin ? fmtDate(l.expectedReadyDateMin) : '-',
            l.expectedReadyDateMax ? fmtDate(l.expectedReadyDateMax) : '-',
            l.dateRecolte ? fmtDate(l.dateRecolte) : '-',
            l.dateLivraison ? fmtDate(l.dateLivraison) : '-',
          ]}
        />
        <span style={{ fontSize: '12px', color: '#111', marginLeft: 'auto' }}>
          {filtered.length} lot{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* ═══ Lots Table ═══ */}
      <div className={classicMode ? 'classic-table' : ''} style={{
        backgroundColor: 'white', border: '1px solid #C8E6C9', borderRadius: '16px', overflow: 'hidden',
      }}>
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th onClick={() => handleSort('code')} style={{ cursor: 'pointer', textAlign: 'center', padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Lot<SortIcon field="code" /></th>
                <th onClick={() => handleSort('semis.code')} style={{ cursor: 'pointer', textAlign: 'center', padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Semis<SortIcon field="semis.code" /></th>
                <th onClick={() => handleSort('semis.variete.nom')} style={{ cursor: 'pointer', textAlign: 'center', padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Variété<SortIcon field="semis.variete.nom" /></th>
                <th onClick={() => handleSort('semis.pepiniere.nom')} style={{ cursor: 'pointer', textAlign: 'center', padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Pépinière<SortIcon field="semis.pepiniere.nom" /></th>
                <th onClick={() => handleSort('quantite')} style={{ cursor: 'pointer', textAlign: 'center', padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Plants<SortIcon field="quantite" /></th>
                <th style={{ textAlign: 'center', padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>Progression</th>
                <th style={{ textAlign: 'center', padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>Prêt (min → max)</th>
                <th onClick={() => handleSort('statut')} style={{ cursor: 'pointer', textAlign: 'center', padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9', userSelect: 'none' }}>Statut<SortIcon field="statut" /></th>
                <th style={{ textAlign: 'right', padding: '14px 16px', fontSize: '12px', fontWeight: 700, color: '#222', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #C8E6C9' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? sortedData.map(lot => {
                const cfg = LOT_STATUS[lot.statut] || LOT_STATUS.en_cours;
                const progress = getProgress(lot);
                return (
                  <tr key={lot._id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#006625', fontFamily: 'monospace' }}>{lot.code || '—'}</span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#006625', fontFamily: 'monospace' }}>{lot.semis?.code || '—'}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#222' }}>{lot.semis?.variete?.nom || '—'}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: '#222' }}>{lot.semis?.pepiniere?.nom || '—'}</span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937' }}>{fmtNumber(lot.quantite)}</span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ flex: 1, height: '6px', backgroundColor: '#f3f4f6', borderRadius: '3px', overflow: 'hidden', minWidth: '50px' }}>
                          <div style={{
                            width: `${progress}%`, height: '100%',
                            backgroundColor: progress >= 100 ? '#6b7280' : progress >= 80 ? '#1e40af' : progress >= 50 ? '#006625' : '#92400e',
                            borderRadius: '3px', transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#222', minWidth: '28px' }}>{progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {lot.expectedReadyDateMin && lot.expectedReadyDateMax ? (
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#1f2937', whiteSpace: 'nowrap' }}>
                          {fmtDate(lot.expectedReadyDateMin)} → {fmtDate(lot.expectedReadyDateMax)}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#111', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 700,
                        whiteSpace: 'nowrap', backgroundColor: cfg.bg, color: cfg.color,
                      }}>
                        <StatusIcon icon={cfg.icon} /> {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <Link to={`/lots/${lot._id}`} style={{
                        padding: '7px 14px', backgroundColor: '#008030', color: 'white',
                        borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                        textDecoration: 'none', whiteSpace: 'nowrap',
                      }}>
                        Détails
                      </Link>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="9" style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', color: '#111', margin: 0 }}>Aucun lot de production trouvé</p>
                    <p style={{ fontSize: '13px', color: '#9ca3af', margin: '6px 0 0' }}>
                      {searchTerm || pepFilter !== 'all' || varFilter !== 'all' || statusFilter !== 'all'
                        ? 'Essayez de modifier les filtres.'
                        : 'Créez un lot de production pour commencer.'}
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

export default ProductionPlanningMerged;
