/**
 * NewStockSemence — Add New Seed Stock Entry (Simplified)
 * =========================================================
 *
 * Only requires: variété + quantité
 * The other fields (fournisseur, lot, prix, date) can be edited
 * later from the detail page if needed.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import stockService from '../services/stockService';
import varieteService from '../services/varieteService';
import fournisseurService from '../services/fournisseurService';
import { Warehouse, ArrowLeft, Package } from 'lucide-react';

const NewStockSemence = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [varietes, setVarietes] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    variete: '',
    quantiteInitiale: '',
    fournisseur: '',
  });

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
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.variete) {
      setError('Veuillez sélectionner une variété.');
      return;
    }
    if (!formData.quantiteInitiale || parseInt(formData.quantiteInitiale) <= 0) {
      setError('La quantité doit être supérieure à 0.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        variete: formData.variete,
        quantiteInitiale: parseInt(formData.quantiteInitiale),
      };
      if (formData.fournisseur) payload.fournisseur = formData.fournisseur;
      await stockService.create(payload);
      navigate('/stock');
    } catch (error) {
      setError(error?.response?.data?.message || 'Erreur lors de la création du stock');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/stock')}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', color: '#222222',
          fontSize: '14px', fontWeight: 500, background: 'none', border: 'none',
          cursor: 'pointer', marginBottom: '24px', padding: '0', fontFamily: 'inherit',
        }}
      >
        <ArrowLeft size={16} />
        Retour au stock
      </button>

      <div style={{
        backgroundColor: 'white',
        border: '1px solid #C8E6C9',
        borderRadius: '16px',
        padding: '32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Warehouse size={28} color="#008030" />
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#222222', margin: 0 }}>
            Nouvelle entrée de stock
          </h1>
        </div>

        <p style={{ fontSize: '15px', color: '#222222', margin: '-8px 0 24px' }}>
          Ajoutez simplement la variété et la quantité. Les autres informations (fournisseur, prix, etc.) peuvent être ajoutées plus tard depuis la page de détail.
        </p>

        <div style={{
          padding: '12px 16px', backgroundColor: '#E3F2FD', border: '1px solid #90CAF9',
          borderRadius: '10px', marginBottom: '20px', display: 'flex',
          alignItems: 'center', gap: '10px',
        }}>
          <Package size={18} color="#1565C0" />
          <span style={{ fontSize: '14px', color: '#1565C0', flex: 1 }}>
            Vous avez plusieurs entrées à ajouter ? Utilisez l'<strong>entrée multiple</strong>.
          </span>
          <button
            type="button"
            onClick={() => navigate('/stock/new/batch')}
            style={{
              padding: '8px 16px', backgroundColor: '#1565C0', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            Entrée multiple →
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} aria-label="Ajouter un stock" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Variete */}
          <div>
            <label htmlFor="stock-variete" style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: '#111111', marginBottom: '10px' }}>
              Variété *
            </label>
            <select
              id="stock-variete"
              value={formData.variete}
              onChange={(e) => setFormData({ ...formData, variete: e.target.value })}
              style={{
                width: '100%', padding: '14px 16px', border: '1px solid #d1d5db',
                borderRadius: '10px', fontSize: '16px', outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit', backgroundColor: 'white',
              }}
              required
            >
              <option value="">Sélectionnez une variété</option>
              {varietes.map((v) => (
                <option key={v._id} value={v._id}>{v.nom} ({v.code})</option>
              ))}
            </select>
          </div>

          {/* Fournisseur */}
          <div>
            <label htmlFor="stock-fournisseur" style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: '#111111', marginBottom: '10px' }}>
              Fournisseur
            </label>
            <select
              id="stock-fournisseur"
              value={formData.fournisseur}
              onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
              style={{
                width: '100%', padding: '14px 16px', border: '1px solid #d1d5db',
                borderRadius: '10px', fontSize: '16px', outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit', backgroundColor: 'white',
              }}
            >
              <option value="">— Aucun —</option>
              {fournisseurs.map((f) => (
                <option key={f._id} value={f._id}>{f.nom} ({f.code})</option>
              ))}
            </select>
          </div>

          {/* Quantite */}
          <div>
            <label htmlFor="stock-quantite" style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: '#111111', marginBottom: '10px' }}>
              Quantité (graines) *
            </label>
            <input
              id="stock-quantite"
              type="number"
              value={formData.quantiteInitiale}
              onChange={(e) => setFormData({ ...formData, quantiteInitiale: e.target.value })}
              style={{
                width: '100%', padding: '14px 16px', border: '1px solid #d1d5db',
                borderRadius: '10px', fontSize: '16px', outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
              required
              min="1"
              placeholder="Nombre de graines reçues"
              autoFocus
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => navigate('/stock')}
              style={{
                flex: 1, padding: '14px', backgroundColor: '#f3f4f6',
                color: '#111111', border: '1px solid #d1d5db', borderRadius: '10px',
                fontSize: '16px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 2, padding: '14px', backgroundColor: submitting ? '#9ca3af' : '#008030',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '16px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {submitting ? 'Création en cours...' : 'Ajouter au stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewStockSemence;
