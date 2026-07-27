/**
 * NewStockBatch — Batch Stock Entry (Table-Based Multi-Row)
 * ==========================================================
 *
 * Allows adding multiple stock entries at once using a dynamic table.
 * Each row: Variété + Fournisseur + Quantité
 * Users can add/remove rows and submit all at once.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import stockService from '../services/stockService';
import varieteService from '../services/varieteService';
import fournisseurService from '../services/fournisseurService';
import { Warehouse, ArrowLeft, Plus, Trash2, Check } from 'lucide-react';

const today = new Date().toISOString().split('T')[0];
const emptyRow = { variete: '', fournisseur: '', quantiteInitiale: '', dateReception: today };

const NewStockBatch = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [varietes, setVarietes] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Rows: start with 3 empty rows
  const [rows, setRows] = useState([{ ...emptyRow }, { ...emptyRow }, { ...emptyRow }]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [varRes, fourRes] = await Promise.all([
          varieteService.getActive(),
          fournisseurService.getActive(),
        ]);
        setVarietes(varRes.data);
        setFournisseurs(fourRes.data);
      } catch (err) {
        console.error(err);
        setError('Impossible de charger les données.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const addRow = () => {
    setRows([...rows, { ...emptyRow }]);
  };

  const removeRow = (index) => {
    if (rows.length <= 1) return; // keep at least one row
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Validate: at least one row with variete + quantity
    const validRows = rows.filter(r => r.variete && r.quantiteInitiale && parseInt(r.quantiteInitiale) > 0);
    if (validRows.length === 0) {
      setError('Ajoutez au moins une ligne avec une variété et une quantité.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        entries: validRows.map(r => ({
          variete: r.variete,
          quantiteInitiale: parseInt(r.quantiteInitiale),
          dateReception: r.dateReception || undefined,
          ...(r.fournisseur ? { fournisseur: r.fournisseur } : {}),
        })),
      };
      const res = await stockService.createBatch(payload);
      const count = res?.data?.length || validRows.length;
      setSuccessMsg(`${count} entrée(s) de stock créée(s) avec succès !`);
      // Reset rows
      setRows([{ ...emptyRow }, { ...emptyRow }, { ...emptyRow }]);
      // Navigate back to stock after short delay
      setTimeout(() => navigate('/stock'), 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur lors de la création du stock');
    } finally {
      setSubmitting(false);
    }
  };

  const getVarieteName = (id) => {
    const v = varietes.find(v => v._id === id);
    return v ? `${v.nom} (${v.code})` : '—';
  };

  if (loading) return <Loading />;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/stock')}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', color: '#222',
          fontSize: '14px', fontWeight: 500, background: 'none', border: 'none',
          cursor: 'pointer', marginBottom: '20px', padding: '0', fontFamily: 'inherit',
        }}
      >
        <ArrowLeft size={16} />
        Retour au stock
      </button>

      <div style={{
        backgroundColor: 'white',
        border: '1px solid #C8E6C9',
        borderRadius: '16px',
        padding: '28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Warehouse size={28} color="#008030" />
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#222', margin: 0 }}>
              Entrée multiple de stock
            </h1>
            <p style={{ fontSize: '14px', color: '#222', margin: '4px 0 0' }}>
              Ajoutez plusieurs entrées de stock en une seule fois
            </p>
          </div>
        </div>

        {/* Success banner */}
        {successMsg && (
          <div style={{
            padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: '10px', color: '#006625', fontSize: '15px', fontWeight: 600,
            marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <Check size={20} color="#008030" /> {successMsg}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div style={{
            padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '8px', color: '#991b1b', fontSize: '14px', marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.8fr 1.3fr 1fr 1.2fr 50px',
            gap: '10px',
            padding: '12px 16px',
            backgroundColor: '#f9fafb',
            borderBottom: '2px solid #C8E6C9',
            borderRadius: '8px 8px 0 0',
            fontWeight: 700,
            fontSize: '12px',
            color: '#222',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <span>Variété *</span>
            <span>Fournisseur</span>
            <span style={{ textAlign: 'right' }}>Qté *</span>
            <span style={{ textAlign: 'center' }}>Date réception</span>
            <span></span>
          </div>

          {/* Rows */}
          <div style={{
            maxHeight: '420px',
            overflowY: 'auto',
            border: '1px solid #C8E6C9',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
          }}>
            {rows.map((row, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '1.8fr 1.3fr 1fr 1.2fr 50px',
                gap: '10px',
                padding: '10px 16px',
                borderBottom: i < rows.length - 1 ? '1px solid #f3f4f6' : 'none',
                alignItems: 'center',
                backgroundColor: row.variete && row.quantiteInitiale ? '#fafefc' : 'white',
              }}>
                {/* Variete */}
                <select
                  value={row.variete}
                  onChange={(e) => handleRowChange(i, 'variete', e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '14px', outline: 'none',
                    backgroundColor: 'white', fontFamily: 'inherit',
                  }}
                  required
                >
                  <option value="">—</option>
                  {varietes.map((v) => (
                    <option key={v._id} value={v._id}>{v.nom} ({v.code})</option>
                  ))}
                </select>

                {/* Fournisseur */}
                <select
                  value={row.fournisseur}
                  onChange={(e) => handleRowChange(i, 'fournisseur', e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '14px', outline: 'none',
                    backgroundColor: 'white', fontFamily: 'inherit',
                  }}
                >
                  <option value="">—</option>
                  {fournisseurs.map((f) => (
                    <option key={f._id} value={f._id}>{f.nom}</option>
                  ))}
                </select>

                {/* Quantite */}
                <input
                  type="number"
                  value={row.quantiteInitiale}
                  onChange={(e) => handleRowChange(i, 'quantiteInitiale', e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', fontFamily: 'inherit', textAlign: 'right',
                  }}
                  min="1"
                  placeholder="0"
                  required
                />

                {/* Date de réception */}
                <input
                  type="date"
                  value={row.dateReception}
                  onChange={(e) => handleRowChange(i, 'dateReception', e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', fontFamily: 'inherit', textAlign: 'center',
                    color: '#1f2937',
                  }}
                />

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  title="Supprimer cette ligne"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '36px', height: '36px',
                    border: '1px solid #fecaca', borderRadius: '8px',
                    backgroundColor: 'white', color: '#ef4444',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#fecaca'; }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={{
            marginTop: '12px', fontSize: '13px', color: '#222',
          }}>
            {rows.filter(r => r.variete && r.quantiteInitiale).length} ligne(s) valide(s)
            {' · '}
            Total : {rows.reduce((sum, r) => sum + (parseInt(r.quantiteInitiale) || 0), 0).toLocaleString()} graines
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={addRow}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '12px 20px', backgroundColor: '#f3f4f6', color: '#111',
                border: '1px solid #d1d5db', borderRadius: '10px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Plus size={16} /> Ajouter une ligne
            </button>

            <div style={{ flex: 1 }} />

            <button
              type="button"
              onClick={() => navigate('/stock')}
              style={{
                padding: '12px 20px', backgroundColor: '#f3f4f6', color: '#111',
                border: '1px solid #d1d5db', borderRadius: '10px',
                fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '12px 28px', backgroundColor: submitting ? '#9ca3af' : '#008030',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '15px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              {submitting ? 'Création en cours...' : 'Ajouter toutes les entrées'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewStockBatch;
