import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import { Search, Calendar } from 'lucide-react';
import useSort from '../hooks/useSort';
import ExportButton from '../components/ExportButton';
import productionRuleService from '../services/productionRuleService';
import { fmtDateShort } from '../utils/dates';
import { inputStyle, tableHeaderStyle, tableCellStyle } from '../utils/styles';

const emptyForm = {
  sowingPeriodLabel: '',
  startDate: '',
  endDate: '',
  productionMinDays: 30,
  productionMaxDays: 60,
  maturityWindowDays: 10,
};

// ── Overlap & gap detection helpers ──
const normalizeToYear = (dateStr, refYear) => {
  const d = new Date(dateStr);
  d.setFullYear(refYear);
  return d;
};

const dayOfYear = (d) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));

/** Check if two date ranges overlap using four-endpoint is-in-range approach. */
const rangesOverlap = (startA, endA, startB, endB) => {
  const inRange = (date, start, end) => {
    const d = new Date(date);
    const s = new Date(start);
    const e = new Date(end);
    const refYear = s.getFullYear();
    d.setFullYear(refYear);
    if (s <= e) return d >= s && d <= e;
    return d >= s || d <= e;
  };
  return inRange(startA, startB, endB) ||
         inRange(endA, startB, endB) ||
         inRange(startB, startA, endA) ||
         inRange(endB, startA, endA);
};

/** Find existing rules with small gaps (< 7 days) relative to a date range. */
const findSmallGaps = (rules, startDate, endDate, excludeId) => {
  const REF = 2000;
  const newStart = normalizeToYear(startDate, REF);
  const newEnd = normalizeToYear(endDate, REF);
  const newStartDOY = dayOfYear(newStart);
  const newEndDOY = dayOfYear(newEnd);

  const closeRules = [];

  for (const rule of rules) {
    if (excludeId && rule._id === excludeId) continue;
    if (!rule.startDate || !rule.endDate) continue;

    const ruleStart = normalizeToYear(rule.startDate, REF);
    const ruleEnd = normalizeToYear(rule.endDate, REF);
    const ruleStartDOY = dayOfYear(ruleStart);
    const ruleEndDOY = dayOfYear(ruleEnd);

    const ruleEndAdjDOY = ruleEndDOY < ruleStartDOY ? ruleEndDOY + 365 : ruleEndDOY;
    const newEndAdjDOY = newEndDOY < newStartDOY ? newEndDOY + 365 : newEndDOY;

    const gapAfter = newStartDOY - ruleEndAdjDOY;
    const gapBefore = ruleStartDOY - newEndAdjDOY;

    if (gapAfter > 0 && gapAfter <= 7) {
      closeRules.push({ rule, gapDays: gapAfter, position: 'after' });
    }
    if (gapBefore > 0 && gapBefore <= 7) {
      closeRules.push({ rule, gapDays: gapBefore, position: 'before' });
    }
  }

  return closeRules;
};

/** Check if the new range overlaps any existing rule. Returns overlapping rules. */
const findOverlaps = (rules, startDate, endDate, excludeId) => {
  const overlapping = [];
  for (const rule of rules) {
    if (excludeId && rule._id === excludeId) continue;
    if (!rule.startDate || !rule.endDate) continue;
    if (rangesOverlap(startDate, endDate, rule.startDate, rule.endDate)) {
      overlapping.push(rule);
    }
  }
  return overlapping;
};

const ProductionRules = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gapWarnings, setGapWarnings] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentRule, setCurrentRule] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, classicMode } = useAuth();

  const fetchRules = async () => {
    try {
      setLoading(true);
      const { data } = await productionRuleService.getAll();
      setRules(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les cycles de semis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // Auto-calculate maturityWindowDays = productionMaxDays - productionMinDays
  useEffect(() => {
    const windowDays = Math.max(0, formData.productionMaxDays - formData.productionMinDays);
    // Only auto-update if not editing (resetForm population) - but always safe to set
    setFormData((prev) => ({
      ...prev,
      maturityWindowDays: windowDays,
    }));
  }, [formData.productionMinDays, formData.productionMaxDays]);

  const resetForm = () => {
    setFormData(emptyForm);
    setCurrentRule(null);
    setGapWarnings([]);
  };

  const checkOverlaps = (excludeId) => {
    const start = formData.startDate;
    const end = formData.endDate;
    if (!start || !end) return true;

    // Check overlaps (blocking)
    const overlapping = findOverlaps(rules, start, end, excludeId);
    if (overlapping.length > 0) {
      const names = overlapping.map(r => `${r.sowingPeriodLabel} (${r.code})`).join(', ');
      setError(`Chevauchement de dates détecté : le cycle chevauche ${names}. Veuillez ajuster les dates.`);
      return false;
    }

    // Check small gaps (non-blocking warning)
    const closeRules = findSmallGaps(rules, start, end, excludeId);
    if (closeRules.length > 0) {
      const msg = closeRules.map(({ rule, gapDays, position }) =>
        `« <strong>${rule.sowingPeriodLabel} (${rule.code})</strong> » — écart de <strong>${gapDays} jour${gapDays > 1 ? 's' : ''}</strong> ${position === 'after' ? 'avant' : 'après'}`
      ).join('<br/>');
      setGapWarnings(closeRules);
      return true; // Warning only, not blocking
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setGapWarnings([]);
    setError('');

    try {
      if (formData.productionMaxDays < formData.productionMinDays) {
        setError('La durée maximale doit être supérieure ou égale à la durée minimale.');
        return;
      }
      if (formData.endDate < formData.startDate) {
        setError('La date de fin doit être postérieure ou égale à la date de début.');
        return;
      }

      // Validate overlaps before submitting
      if (!checkOverlaps(null)) return;

      // Normalize date: keep year as 2000 (cycles repeat annually)
      const refDate = (d) => {
        const dt = new Date(d);
        dt.setFullYear(2000);
        return dt;
      };

      const payload = {
        ...formData,
        startDate: refDate(formData.startDate),
        endDate: refDate(formData.endDate),
      };
      await productionRuleService.create(payload);
      await fetchRules();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Impossible de créer le cycle.');
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setGapWarnings([]);
    setError('');

    try {
      if (formData.productionMaxDays < formData.productionMinDays) {
        setError('La durée maximale doit être supérieure ou égale à la durée minimale.');
        return;
      }
      if (formData.endDate < formData.startDate) {
        setError('La date de fin doit être postérieure ou égale à la date de début.');
        return;
      }

      // Validate overlaps before submitting (exclude current rule in edit mode)
      if (!checkOverlaps(currentRule?._id)) return;

      // Normalize date: keep year as 2000 (cycles repeat annually)
      const refDate = (d) => {
        const dt = new Date(d);
        dt.setFullYear(2000);
        return dt;
      };

      const payload = {
        ...formData,
        startDate: refDate(formData.startDate),
        endDate: refDate(formData.endDate),
      };
      await productionRuleService.update(currentRule._id, payload);
      await fetchRules();
      setIsEditModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Impossible de modifier le cycle.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await productionRuleService.delete(deleteTarget._id);
      await fetchRules();
      setIsDeleteConfirmOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Impossible de supprimer le cycle.');
    }
  };

  const openCreateModal = () => {
    resetForm();
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (rule) => {
    setCurrentRule(rule);
    // Normalize dates to year 2000 for month/day display
    const fmtMd = (d) => {
      if (!d) return '';
      const date = new Date(d);
      return `2000-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    setFormData({
      sowingPeriodLabel: rule.sowingPeriodLabel || '',
      startDate: fmtMd(rule.startDate),
      endDate: fmtMd(rule.endDate),
      productionMinDays: rule.productionMinDays || 30,
      productionMaxDays: rule.productionMaxDays || 60,
      maturityWindowDays: rule.maturityWindowDays || 10,
    });
    setError('');
    setIsEditModalOpen(true);
  };

  const openDeleteConfirm = (rule) => {
    setDeleteTarget(rule);
    setIsDeleteConfirmOpen(true);
  };

  const renderCommonFormFields = () => (
    <>
      <div>
        <label htmlFor="rule-label" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '6px' }}>
          Libellé période *
        </label>
        <input
          id="rule-label"
          type="text"
          required
          value={formData.sowingPeriodLabel}
          onChange={(e) => setFormData({ ...formData, sowingPeriodLabel: e.target.value })}
          style={inputStyle}
          placeholder="Ex: Fin Décembre"
        />
      </div>

      {/* Month/Day pickers for start/end dates (no year — cycles repeat annually) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label htmlFor="rule-start-month" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '6px' }}>
            Mois début *
          </label>
          <select
            id="rule-start-month"
            required
            value={formData.startDate ? formData.startDate.split('-')[1] : ''}
            onChange={(e) => {
              const month = e.target.value;
              const day = formData.startDate ? formData.startDate.split('-')[2] || '1' : '1';
              setFormData({ ...formData, startDate: `2000-${month}-${day.padStart(2, '0')}` });
            }}
            style={inputStyle}
          >
            <option value="">Mois</option>
            {[
              { value: '01', label: 'Janvier' },
              { value: '02', label: 'Février' },
              { value: '03', label: 'Mars' },
              { value: '04', label: 'Avril' },
              { value: '05', label: 'Mai' },
              { value: '06', label: 'Juin' },
              { value: '07', label: 'Juillet' },
              { value: '08', label: 'Août' },
              { value: '09', label: 'Septembre' },
              { value: '10', label: 'Octobre' },
              { value: '11', label: 'Novembre' },
              { value: '12', label: 'Décembre' },
            ].map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rule-start-day" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '6px' }}>
            Jour début *
          </label>
          <select
            id="rule-start-day"
            required
            value={formData.startDate ? formData.startDate.split('-')[2] || '' : ''}
            onChange={(e) => {
              const month = formData.startDate ? formData.startDate.split('-')[1] || '01' : '01';
              setFormData({ ...formData, startDate: `2000-${month}-${e.target.value.padStart(2, '0')}` });
            }}
            style={inputStyle}
          >
            <option value="">Jour</option>
            {Array.from({ length: 31 }, (_, i) => {
              const day = String(i + 1).padStart(2, '0');
              return <option key={day} value={day}>{day}</option>;
            })}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label htmlFor="rule-end-month" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '6px' }}>
            Mois fin *
          </label>
          <select
            id="rule-end-month"
            required
            value={formData.endDate ? formData.endDate.split('-')[1] : ''}
            onChange={(e) => {
              const month = e.target.value;
              const day = formData.endDate ? formData.endDate.split('-')[2] || '1' : '1';
              setFormData({ ...formData, endDate: `2000-${month}-${day.padStart(2, '0')}` });
            }}
            style={inputStyle}
          >
            <option value="">Mois</option>
            {[
              { value: '01', label: 'Janvier' },
              { value: '02', label: 'Février' },
              { value: '03', label: 'Mars' },
              { value: '04', label: 'Avril' },
              { value: '05', label: 'Mai' },
              { value: '06', label: 'Juin' },
              { value: '07', label: 'Juillet' },
              { value: '08', label: 'Août' },
              { value: '09', label: 'Septembre' },
              { value: '10', label: 'Octobre' },
              { value: '11', label: 'Novembre' },
              { value: '12', label: 'Décembre' },
            ].map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rule-end-day" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '6px' }}>
            Jour fin *
          </label>
          <select
            id="rule-end-day"
            required
            value={formData.endDate ? formData.endDate.split('-')[2] || '' : ''}
            onChange={(e) => {
              const month = formData.endDate ? formData.endDate.split('-')[1] || '01' : '01';
              setFormData({ ...formData, endDate: `2000-${month}-${e.target.value.padStart(2, '0')}` });
            }}
            style={inputStyle}
          >
            <option value="">Jour</option>
            {Array.from({ length: 31 }, (_, i) => {
              const day = String(i + 1).padStart(2, '0');
              return <option key={day} value={day}>{day}</option>;
            })}
          </select>
        </div>
      </div>          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label htmlFor="rule-min-days" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '6px' }}>
            Durée min cycle (jours) *
          </label>
          <input
            id="rule-min-days"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            value={formData.productionMinDays}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setFormData({ ...formData, productionMinDays: val === '' ? '' : Number(val) });
            }}
            style={{
              ...inputStyle,
              '::-webkit-inner-spin-button': { display: 'none' },
              '::-webkit-outer-spin-button': { display: 'none' },
              MozAppearance: 'textfield',
            }}
            placeholder="Ex: 30"
          />
          <style>{`
            #rule-min-days::-webkit-inner-spin-button,
            #rule-min-days::-webkit-outer-spin-button,
            #rule-max-days::-webkit-inner-spin-button,
            #rule-max-days::-webkit-outer-spin-button,
            #rule-maturity::-webkit-inner-spin-button,
            #rule-maturity::-webkit-outer-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
            #rule-min-days, #rule-max-days, #rule-maturity {
              -moz-appearance: textfield;
            }
          `}</style>
        </div>
        <div>
          <label htmlFor="rule-max-days" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '6px' }}>
            Durée max cycle (jours) *
          </label>
          <input
            id="rule-max-days"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            min="1"
            value={formData.productionMaxDays}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setFormData({ ...formData, productionMaxDays: val === '' ? '' : Number(val) });
            }}
            style={{
              ...inputStyle,
              MozAppearance: 'textfield',
            }}
            placeholder="Ex: 60"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label htmlFor="rule-maturity" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111111', marginBottom: '6px' }}>
            Fenêtre de maturité (jours) *
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="rule-maturity"
              type="text"
              inputMode="numeric"
              required
              value={formData.maturityWindowDays}
              readOnly
              style={{
                ...inputStyle,
                backgroundColor: '#f0fdf4',
                color: '#006625',
                fontWeight: 600,
                border: '1px solid #bbf7d0',
                cursor: 'not-allowed',
                MozAppearance: 'textfield',
              }}
            />
            <span style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '11px',
              fontWeight: 600,
              color: '#006625',
              backgroundColor: '#dcfce7',
              padding: '2px 8px',
              borderRadius: '4px',
              pointerEvents: 'none',
            }}>
              Auto
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#006625', margin: '4px 0 0' }}>
            Calculée automatiquement (max − min)
          </p>
        </div>
      </div>
    </>
  );

  const renderModal = (title, onSubmit, submitLabel, onClose) => (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '28px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#222222', margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Fermer" style={{ fontSize: '20px', fontWeight: 500, color: '#222222', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
        </div>

        {error && (
          <div style={{ padding: '14px 18px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '16px', fontSize: '16px' }}>
            {error}
          </div>
        )}
        {gapWarnings.length > 0 && (
          <div style={{ padding: '14px 18px', backgroundColor: '#fffbeb', color: '#92400e', borderRadius: '8px', marginBottom: '16px', fontSize: '15px', border: '1px solid #fde68a', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>⚠️ Faible écart entre cycles détecté :</div>
            {gapWarnings.map((w, i) => (
              <div key={i} style={{ marginBottom: i < gapWarnings.length - 1 ? '4px' : 0 }}>
                « <strong>{w.rule.sowingPeriodLabel} ({w.rule.code})</strong> » — écart de <strong>{w.gapDays} jour{w.gapDays > 1 ? 's' : ''}</strong> {w.position === 'after' ? 'avant' : 'après'}
              </div>
            ))}
            <div style={{ marginTop: '8px' }}>Souhaitez-vous tout de même continuer ?</div>
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {renderCommonFormFields()}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', backgroundColor: '#f3f4f6', color: '#111111', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', fontWeight: 500, cursor: 'pointer' }}>
              Annuler
            </button>
            <button type="submit" style={{ flex: 2, padding: '12px', backgroundColor: '#008030', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const filteredRules = rules.filter((r) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.sowingPeriodLabel?.toLowerCase().includes(q) ||
      r.code?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q)
    );
  });
  const { sortedData, handleSort, SortIcon } = useSort(filteredRules, { defaultField: 'code' });

  if (loading) return <Loading />;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <Calendar size={32} color="#B02020" />
            <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#222222', margin: 0 }}>Cycles de Semis</h1>
          </div>
          <p style={{ fontSize: '18px', color: '#222222', marginLeft: '44px' }}>
            Définissez les durées de production par période de semis (calendrier)
          </p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={openCreateModal}
            style={{
              padding: '12px 24px',
              backgroundColor: '#008030',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#006625'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#008030'; }}
          >
            + Ajouter un cycle
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Search + Export */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'stretch' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={20} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#111111' }} />
          <input
            type="text"
            placeholder="Rechercher par période ou code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 18px 14px 46px',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#111111', cursor: 'pointer', fontSize: '16px' }}>
              ×
            </button>
          )}
        </div>
<ExportButton
          user={user}
          filename="cycles-de-semis"
          columns={[{ accessor: 'code', header: 'Code' }, { accessor: 'sowingPeriodLabel', header: 'Période' }, { accessor: 'startDate', header: 'Date début' }, { accessor: 'endDate', header: 'Date fin' }, { accessor: 'productionMinDays', header: 'Durée min (j)' }, { accessor: 'productionMaxDays', header: 'Durée max (j)' }, { accessor: 'maturityWindowDays', header: 'Fenêtre de maturité (j)' }]}
          data={filteredRules}
          mapRow={(r) => [r.code || '-', r.sowingPeriodLabel || '-', r.startDate ? new Date(r.startDate).toLocaleDateString('fr-FR') : '-', r.endDate ? new Date(r.endDate).toLocaleDateString('fr-FR') : '-', r.productionMinDays?.toString() || '-', r.productionMaxDays?.toString() || '-', r.maturityWindowDays?.toString() || '-']}
        />
      </div>

      {/* Table */}
      {filteredRules.length > 0 ? (
        <div className={classicMode ? 'classic-table table-scroll' : 'table-scroll'} style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr>
                <th onClick={() => handleSort('code')} style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none' }}>Code<SortIcon field="code" /></th>
                <th onClick={() => handleSort('sowingPeriodLabel')} style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none' }}>Période<SortIcon field="sowingPeriodLabel" /></th>
                <th onClick={() => handleSort('startDate')} style={{ ...tableHeaderStyle, cursor: 'pointer', userSelect: 'none' }}>Dates<SortIcon field="startDate" /></th>
                <th onClick={() => handleSort('productionMinDays')} style={{ ...tableHeaderStyle, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>Durée min<SortIcon field="productionMinDays" /></th>
                <th onClick={() => handleSort('productionMaxDays')} style={{ ...tableHeaderStyle, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>Durée max<SortIcon field="productionMaxDays" /></th>
                <th onClick={() => handleSort('maturityWindowDays')} style={{ ...tableHeaderStyle, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>Fenêtre de maturité<SortIcon field="maturityWindowDays" /></th>
                {user?.role === 'admin' && <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((rule) => (
                <tr
                  key={rule._id}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                    <span style={{
                      fontSize: '22px',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      color: '#B02020',
                      backgroundColor: '#fef2f2',
                      padding: '6px 16px',
                      borderRadius: '6px',
                      letterSpacing: '0.8px',
                    }}>
                      {rule.code || '-'}
                    </span>
                  </td>
                  <td style={{ ...tableCellStyle, fontWeight: 600 }}>
                    {rule.sowingPeriodLabel}
                    {rule.notes && (
                      <div style={{ fontSize: '12px', color: '#111111', fontStyle: 'italic', marginTop: '2px' }}>
                        {rule.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tableCellStyle, whiteSpace: 'nowrap', minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="#a16207" />
                      <span style={{ fontSize: '13px', color: '#713f12', fontWeight: 500 }}>
                        {fmtDateShort(rule.startDate)} — {fmtDateShort(rule.endDate)}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 700, color: '#006625', fontSize: '16px' }}>
                    {rule.productionMinDays}
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 700, color: '#111111', fontSize: '16px' }}>
                    {rule.productionMaxDays || rule.productionMinDays}
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 800, color: '#d97706', fontSize: '20px' }}>
                    {rule.maturityWindowDays}
                  </td>
                  {user?.role === 'admin' && (
                    <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => openEditModal(rule)}
                          title="Modifier"
                          style={{
                            padding: '6px 14px',
                            backgroundColor: 'white',
                            color: '#111111',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; e.currentTarget.style.borderColor = '#9ca3af'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(rule)}
                          title="Supprimer"
                          style={{
                            padding: '6px 14px',
                            backgroundColor: 'white',
                            color: '#ef4444',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#fecaca'; }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '80px 40px', textAlign: 'center', color: '#222222', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #C8E6C9' }}>
          <Calendar size={56} style={{ color: '#d1d5db', marginBottom: '20px' }} />
          <p style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
            {searchTerm ? 'Aucun cycle trouvé.' : 'Aucun cycle de semis configuré.'}
          </p>
          <p style={{ fontSize: '16px', marginTop: '8px' }}>
            {searchTerm ? 'Essayez une autre recherche.' : 'Ajoutez des cycles pour définir les durées de production par période de semis.'}
          </p>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && renderModal('Ajouter un cycle de semis', handleSubmit, 'Créer', () => { setIsModalOpen(false); resetForm(); })}

      {/* Edit Modal */}
      {isEditModalOpen && currentRule && renderModal('Modifier le cycle', handleEditSubmit, 'Mettre à jour', () => { setIsEditModalOpen(false); resetForm(); })}

      {/* Delete Confirmation */}
      {isDeleteConfirmOpen && deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 50 }}
          onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }}>
          <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', borderRadius: '12px', padding: '28px' }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#222222', margin: 0, marginBottom: '12px' }}>Confirmer la suppression</h2>
            <p style={{ fontSize: '16px', color: '#222222', margin: 0, marginBottom: '20px' }}>
              Êtes-vous sûr de vouloir supprimer le cycle <strong>{deleteTarget.sowingPeriodLabel}</strong> ({deleteTarget.code}) ?
              Les lots de production existants conserveront leurs dates calculées.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }}
                style={{ flex: 1, padding: '12px', backgroundColor: '#f3f4f6', color: '#111111', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', fontWeight: 500, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={handleDelete}
                style={{ flex: 1, padding: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionRules;
