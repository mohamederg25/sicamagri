import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Loading from '../components/Loading';
import semisService from '../services/semisService';
import productionRuleService from '../services/productionRuleService';
import lotService from '../services/lotService';
import { isDateInRange, findMatchingRule } from '../utils/dates';

const germStyle = (rate) => {
  if (rate === null || rate === undefined) return { bg: '#f3f4f6', color: '#111111' };
  if (rate >= 70) return { bg: '#dcfce7', color: '#006625' };
  if (rate >= 40) return { bg: '#fef3c7', color: '#92400e' };
  return { bg: '#fee2e2', color: '#991b1b' };
};

/* ── Calendar Popup: shows valid production dates highlighted ── */
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS = ['Lu','Ma','Me','Je','Ve','Sa','Di'];

const CalendarPopup = ({ rules, selectedDate, onSelect }) => {
  const today = new Date();
  const parsedSelected = selectedDate ? new Date(selectedDate + 'T12:00:00') : today;
  const [viewYear, setViewYear] = useState(parsedSelected.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedSelected.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  const todayStr = today.toISOString().split('T')[0];

  const getRuleForDate = (day) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    for (const rule of rules) {
      if (isDateInRange(dateStr, rule.startDate, rule.endDate) && rule.isActive) {
        return rule;
      }
    }
    return null;
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`e-${i}`} style={{ aspectRatio: '1' }} />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const rule = getRuleForDate(d);
    const isValid = !!rule;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;

    cells.push(
      <div
        key={d}
        onClick={() => isValid && onSelect(dateStr)}
        title={rule ? `${rule.code} · ${rule.sowingPeriodLabel}` : 'Date non disponible'}
        style={{
          aspectRatio: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: isSelected || isToday ? 700 : 500,
          cursor: isValid ? 'pointer' : 'default',
          backgroundColor: isSelected ? '#006625' : isValid ? '#dcfce7' : '#f9fafb',
          color: isSelected ? '#fff' : isValid ? '#006625' : '#d1d5db',
          border: isToday && !isSelected ? '2px solid #006625' : 'none',
          outline: isSelected ? '2px solid #006625' : 'none',
          outlineOffset: isSelected ? '2px' : '0',
          transition: 'all 0.1s',
          position: 'relative',
        }}
        onMouseEnter={e => { if (isValid && !isSelected) { e.currentTarget.style.backgroundColor = '#bbf7d0'; } }}
        onMouseLeave={e => { if (isValid && !isSelected) { e.currentTarget.style.backgroundColor = '#dcfce7'; } }}
      >
        {d}
        {rule && isValid && (
          <span style={{
            position: 'absolute',
            bottom: '1px',
            fontSize: '7px',
            fontWeight: 800,
            color: '#006625',
            opacity: 0.7,
            lineHeight: 1,
          }}>
            {rule.code.replace('P', '')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #C8E6C9',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
      marginTop: '8px',
      position: 'absolute',
      zIndex: 100,
      width: '320px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px 8px', color: '#222222' }}>
          ‹
        </button>
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937' }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px 8px', color: '#222222' }}>
          ›
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', justifyContent: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#222222' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#dcfce7', display: 'inline-block' }} />
          Disponible
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#222222' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f9fafb', border: '1px solid #C8E6C9', display: 'inline-block' }} />
          Indisponible
        </span>
      </div>

      {/* Day headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px',
        marginBottom: '4px',
      }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#111111', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px',
      }}>
        {cells}
      </div>

      {/* Rules summary */}
      {rules.length > 0 && (
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #C8E6C9' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#222222', marginBottom: '6px' }}>
            Règles actives :
          </div>
          {rules.map(r => {
            const startStr = new Date(r.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
            const endStr = new Date(r.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
            return (
              <div key={r._id} style={{ fontSize: '11px', color: '#111111', marginBottom: '3px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#006625' }}>{r.code}</span>
                {' · '}{r.sowingPeriodLabel} · {startStr}→{endStr}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const NewProductionLot = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [semisList, setSemisList] = useState([]);
  const [productionRules, setProductionRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);

  useEffect(() => {
    if (!showCalendar) return;
    const handleClick = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showCalendar]);

  const [formData, setFormData] = useState({
    semis: '',
    quantite: '',
    dateEntree: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const safeFetch = async (fn) => {
          try { return await fn(); } catch (e) { console.error(e); return { data: [] }; }
        };

        const [semisRes, rulesRes] = await Promise.all([
          safeFetch(() => semisService.getAllIndividual()),
          safeFetch(() => productionRuleService.getActive()),
        ]);
        setSemisList(semisRes.data || []);
        setProductionRules(rulesRes.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Semis that have a germination rate (inherited from stock) AND disponible quantity ──
  const semisWithGermination = useMemo(() => {
    return semisList.filter(s => {
      const dispo = Math.max(0, (s.quantite || 0) - (s.quantiteUtilisee || 0));
      return s.tauxGermination != null && dispo > 0;
    });
  }, [semisList]);

  // ── Selected semis ──
  const selectedSemis = useMemo(() => {
    if (!formData.semis) return null;
    return semisList.find(s => s._id === formData.semis) || null;
  }, [formData.semis, semisList]);

  // ── Available quantity for selected semis ──
  const selectedDispo = useMemo(() => {
    if (!selectedSemis) return 0;
    return Math.max(0, (selectedSemis.quantite || 0) - (selectedSemis.quantiteUtilisee || 0));
  }, [selectedSemis]);

  // ── Resolve matching production rule ──
  const varieteId = selectedSemis?.variete?._id || selectedSemis?.variete;
  const matchingRule = useMemo(() => {
    if (!productionRules.length) return null;
    if (!formData.dateEntree || !varieteId) return null;
    return findMatchingRule(productionRules, formData.dateEntree, varieteId);
  }, [productionRules, formData.dateEntree, varieteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.semis) {
      setError('Veuillez sélectionner un semis source.');
      return;
    }
    if (!formData.quantite || Number(formData.quantite) <= 0) {
      setError('La quantité doit être supérieure à 0.');
      return;
    }
    if (selectedSemis && Number(formData.quantite) > selectedDispo) {
      setError(`Quantité insuffisante. Maximum disponible : ${selectedDispo}`);
      return;
    }
    if (!formData.dateEntree) {
      setError('Veuillez sélectionner une date de semis.');
      return;
    }
    if (!matchingRule) {
      setError('La date sélectionnée ne correspond à aucun cycle de semis actif.');
      return;
    }

    try {
      const data = {
        type: 'production',
        semis: formData.semis,
        quantite: formData.quantite,
        dateEntree: formData.dateEntree,
      };

      await lotService.create(data);
      navigate('/lots/production');
    } catch (error) {
      setError(error.response?.data?.message || 'Erreur lors de la création du lot de production');
    }
  };

  const isSubmitDisabled = !formData.semis || (
    !formData.dateEntree || !matchingRule
  );

  if (loading) return <Loading />;

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#222222',
          fontSize: '14px',
          fontWeight: 500,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          marginBottom: '24px',
          padding: '0'
        }}
      >
        Retour
      </button>

      <div style={{
        backgroundColor: 'white',
        border: '1px solid #C8E6C9',
        borderRadius: '16px',
        padding: '32px'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          color: '#222222',
          marginBottom: '28px'
        }}>
          Ajouter un lot de production
        </h1>

        {error && (
          <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} aria-label="Créer un lot de production" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Semis source (with tauxGermination inherited from stock) */}
          <div>
            <label htmlFor="semis-source" style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 600,
              color: '#111111',
              marginBottom: '10px'
            }}>
              Semis source *
              <span style={{ fontSize: '13px', fontWeight: 400, color: '#222222', marginLeft: '6px' }}>
                (semis avec taux de germination hérité du stock)
              </span>
            </label>
            <select
              id="semis-source"
              value={formData.semis}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, semis: e.target.value }));
              }}
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: 'white'
              }}
              required
            >
              <option value="">Sélectionnez un semis source</option>
              {semisWithGermination.map(s => {
                const dispo = Math.max(0, (s.quantite || 0) - (s.quantiteUtilisee || 0));
                const isExhausted = dispo <= 0;
                return (
                  <option key={s._id} value={s._id} disabled={isExhausted} style={isExhausted ? { color: '#d1d5db' } : {}}>
                    {s.code || '-'} - {(s.variete?.nom || '?')} - {(s.pepiniere?.nom || '?')}
                    {' | Germ. '}{s.tauxGermination != null ? `${s.tauxGermination}%` : '?'}
                    {' | '}{dispo} disp.
                    {isExhausted ? ' (épuisé)' : ''}
                  </option>
                );
              })}
              {semisWithGermination.length === 0 && (
                <option value="" disabled>Aucun semis avec taux de germination</option>
              )}
            </select>
            {selectedSemis && (
              <div style={{
                marginTop: '10px',
                padding: '12px 16px',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                border: '1px solid #bbf7d0',
                fontSize: '14px',
                color: '#006625'
              }}>
                Semis : <strong>{selectedSemis.code}</strong>
                {' · '}
                Variété : <strong>{selectedSemis.variete?.nom}</strong>
                {' · '}
                Pépinière : <strong>{selectedSemis.pepiniere?.nom}</strong>
                <br />
                Taux de germination : <strong style={{ fontWeight: 700, color: germStyle(selectedSemis.tauxGermination).color }}>{selectedSemis.tauxGermination != null ? `${selectedSemis.tauxGermination}%` : 'Non défini'}</strong>
                {' · '}
                Disponible : <strong>{selectedDispo}</strong>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Quantité à planter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: 600,
                color: '#111111',
                marginBottom: '10px'
              }}>
                Quantité à planter {selectedSemis && (
                  <span style={{ fontSize: '13px', fontWeight: 400, color: '#222222' }}>
                    (max. <strong style={{ color: selectedDispo > 0 ? '#008030' : '#991b1b' }}>{selectedDispo}</strong> disponibles)
                  </span>
                )}
              </label>
              <input
                type="number"
                value={formData.quantite}
                onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: `1px solid ${selectedSemis && formData.quantite && Number(formData.quantite) > selectedDispo ? '#fca5a5' : '#d1d5db'}`,
                  borderRadius: '10px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
                min="1"
                max={selectedSemis ? selectedDispo : undefined}
              />
              {selectedSemis && formData.quantite && Number(formData.quantite) > selectedDispo && (
                <div style={{
                  marginTop: '8px',
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#991b1b',
                }}>
                  Stock insuffisant : la quantité demandée ({formData.quantite}) dépasse le disponible ({selectedDispo})
                </div>
              )}
            </div>

            {/* Date with calendar */}
            <div style={{ position: 'relative' }} ref={calendarRef}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: 600,
                color: '#111111',
                marginBottom: '10px'
              }}>
                Date de semis *
              </label>
              <div
                onClick={() => setShowCalendar(!showCalendar)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: `1px solid ${formData.dateEntree && formData.semis && !matchingRule ? '#fca5a5' : '#d1d5db'}`,
                  borderRadius: '10px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  userSelect: 'none',
                }}
              >
                <span style={{ color: formData.dateEntree ? '#1f2937' : '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {formData.dateEntree
                    ? new Date(formData.dateEntree + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                    : 'Sélectionnez une date'
                  }
                </span>
                <span style={{ fontSize: '12px', color: '#111111' }}>
                  {showCalendar ? '▲' : '▼'}
                </span>
              </div>
              <input type="hidden" value={formData.dateEntree} readOnly />
              {showCalendar && (
                <CalendarPopup
                  rules={productionRules}
                  selectedDate={formData.dateEntree}
                  onSelect={(dateStr) => {
                    setFormData(prev => ({ ...prev, dateEntree: dateStr }));
                    setShowCalendar(false);
                  }}
                />
              )}
            </div>
          </div>

          {/* ── Production Rule Info ── */}
          {formData.dateEntree && formData.semis && matchingRule && (
            <div style={{
              padding: '18px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#006625' }}>
                  [OK] Cycle de semis appliqué
                </span>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  backgroundColor: '#dcfce7',
                  color: '#006625',
                }}>
                  {matchingRule.code}
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937', marginBottom: '4px' }}>
                {matchingRule.sowingPeriodLabel}
              </div>
              <div style={{ fontSize: '14px', color: '#222222' }}>
                Période : {new Date(matchingRule.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} → {new Date(matchingRule.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                {' · '}{matchingRule.productionMinDays} jours (prod.) · Fenêtre maturité {matchingRule.maturityWindowDays}j
              </div>
              <div style={{ fontSize: '13px', color: '#006625', marginTop: '6px' }}>
                 Basé sur la date du {new Date(formData.dateEntree).toLocaleDateString('fr-FR')}
              </div>
            </div>
          )}

          {formData.dateEntree && formData.semis && !matchingRule && (
            <div style={{
              padding: '16px 18px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              fontSize: '15px',
              color: '#991b1b',
            }}>
              <strong style={{ fontSize: '16px' }}>[NOK] Vous ne pouvez pas utiliser cette date</strong>
              — Aucun cycle de semis (<span style={{ fontFamily: 'monospace', fontWeight: 700 }}>C0001</span>,<span style={{ fontFamily: 'monospace', fontWeight: 700 }}>C0002</span>, etc.) ne couvre cette date.
              <br />
              <span style={{ fontSize: '13px', color: '#b91c1c' }}>
                Choisissez une date qui correspond à une période de production valide.
              </span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => navigate('/lots/production')}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#f3f4f6',
                color: '#111111',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!!isSubmitDisabled}
              style={{
                flex: 2,
                padding: '12px',
                backgroundColor: isSubmitDisabled ? '#9ca3af' : '#008030',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                opacity: isSubmitDisabled ? 0.5 : 1
              }}
            >
              {formData.semis && (!formData.dateEntree || !matchingRule)
                ? !formData.dateEntree ? 'Choisissez une date' : 'Date non valide'
                : 'Créer le lot de production'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProductionLot;
