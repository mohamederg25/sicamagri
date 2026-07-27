import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import semisService from '../services/semisService';
import pepiniereService from '../services/pepiniereService';
import stockService from '../services/stockService';

import { TestTube, ArrowRight, ExternalLink } from 'lucide-react';

const NewSemis = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [pepinieres, setPepinieres] = useState([]);

  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pre-selected stock from URL params (e.g., ?stockId=XXX)
  const preselectedStockId = searchParams.get('stockId') || '';

  const [formData, setFormData] = useState({
    type: 'pepiniere',
    pepiniere: '',
    motif: '',
    stockRef: preselectedStockId,
    quantite: '',
    dateSemis: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [pepRes, stockRes] = await Promise.all([
          pepiniereService.getActive(),
          stockService.getAll(),
        ]);
        setPepinieres(pepRes.data);
        // Filter stock entries that have seeds available and are not future-dated
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        setStockList((stockRes.data || []).filter(s => {
          if (s.quantiteRestante <= 0) return false;
          // Check if stock reception date is in the past or today
          if (s.dateReception) {
            const recDate = new Date(s.dateReception);
            recDate.setHours(0, 0, 0, 0);
            if (recDate > now) return false;
          }
          return true;
        }));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // When a stock is selected, auto-fill variete
  const selectedStock = useMemo(() => {
    if (!formData.stockRef) return null;
    return stockList.find(s => s._id === formData.stockRef) || null;
  }, [formData.stockRef, stockList]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.stockRef) {
      setError('Veuillez sélectionner un stock source');
      return;
    }
    if (!selectedStock) {
      setError('Stock non trouvé');
      return;
    }

    // ── Date validation: dateSemis >= dateReception ──
    if (formData.dateSemis && selectedStock.dateReception) {
      const semisDate = new Date(formData.dateSemis);
      const recDate = new Date(selectedStock.dateReception);
      recDate.setHours(0, 0, 0, 0);
      semisDate.setHours(0, 0, 0, 0);
      if (semisDate < recDate) {
        setError(
          `La date de semis (${semisDate.toLocaleDateString('fr-FR')}) ne peut pas être antérieure à la date de réception du stock (${recDate.toLocaleDateString('fr-FR')}).`
        );
        return;
      }
    }

    // ── Validate dateSemis is not in the future ──
    if (formData.dateSemis) {
      const semisDate = new Date(formData.dateSemis);
      semisDate.setHours(23, 59, 59, 999);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (semisDate > today) {
        setError('La date de semis ne peut pas être dans le futur.');
        return;
      }
    }

    const quantite = parseInt(formData.quantite);
    if (!quantite || quantite <= 0) {
      setError('La quantité doit être supérieure à 0');
      return;
    }
    if (quantite > selectedStock.quantiteRestante) {
      setError(`Quantité insuffisante. Stock disponible : ${selectedStock.quantiteRestante} graines`);
      return;
    }

    try {
      if (formData.type === 'externe') {
        // ── Sortie externe : utilise l'API mouvement (bon_passage) → pas de Semis créé ──
        await stockService.createMovement(formData.stockRef, {
          type: 'bon_passage',
          quantite: quantite,
          motif: formData.motif,
          dateMouvement: new Date().toISOString().split('T')[0],
        });
        navigate('/stock');
      } else {
        // ── Sortie pépinière : crée un Semis + mouvement ──
        const payload = {
          variete: selectedStock.variete._id || selectedStock.variete,
          type: 'pepiniere',
          quantite: quantite,
          dateSemis: formData.dateSemis,
          statut: 'prevue',
          stockRef: formData.stockRef,
          pepiniere: formData.pepiniere,
        };
        await semisService.create(payload);
        navigate('/semis');
      }
    } catch (error) {
      console.error(error);
      setError(error.response?.data?.message || 'Erreur lors de la création de la sortie');
    }
  };

  // Compute available stock for the selected pepiniere
  const filteredStockList = useMemo(() => {
    return stockList.filter(s => {
      const taux = s.tauxGermination != null ? s.tauxGermination : s.tauxManuel;
      return taux != null; // Only show stocks with germination rate
    });
  }, [stockList]);

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
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#222222', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ArrowRight size={28} color="#1565C0" />
          Sortie de stock
        </h1>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: 'pepiniere', pepiniere: '' })}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              border: formData.type === 'pepiniere'
                ? '2px solid #1565C0'
                : '1px solid #d1d5db',
              backgroundColor: formData.type === 'pepiniere' ? '#EFF6FF' : 'white',
              color: formData.type === 'pepiniere' ? '#1565C0' : '#111111',
              textAlign: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>
              <ArrowRight size={20} style={{ display: 'inline' }} />
            </div>
            Sortie en pépinière
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: 'externe', pepiniere: '' })}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              border: formData.type === 'externe'
                ? '2px solid #D97706'
                : '1px solid #d1d5db',
              backgroundColor: formData.type === 'externe' ? '#FFFBEB' : 'white',
              color: formData.type === 'externe' ? '#D97706' : '#111111',
              textAlign: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>
              <ExternalLink size={20} style={{ display: 'inline' }} />
            </div>
            Sortie externe
          </button>
        </div>

        {formData.type === 'pepiniere' ? (
          <p style={{ fontSize: '15px', color: '#222222', margin: '-12px 0 24px' }}>
            Créez une sortie de stock vers une pépinière. La variété est automatiquement déterminée à partir du stock sélectionné.
          </p>
        ) : (
          <p style={{ fontSize: '15px', color: '#222222', margin: '-12px 0 24px' }}>
            Créez une sortie externe de stock (hors pépinière). La variété est automatiquement déterminée à partir du stock sélectionné.
          </p>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} aria-label="Sortie en pépinière" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {formData.type === 'pepiniere' ? (
            /* Pepiniere selection */
            <div>
              <label htmlFor="semis-pepiniere" style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: '#111111', marginBottom: '10px' }}>
                Pépinière de destination *
              </label>
              <select
                id="semis-pepiniere"
                value={formData.pepiniere}
                onChange={(e) => setFormData({ ...formData, pepiniere: e.target.value })}
                style={selectStyle}
                required
              >
                <option value="">Sélectionnez une pépinière</option>
                {pepinieres.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.nom}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            /* Motif for external output */
            <div>
              <label htmlFor="semis-motif" style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: '#111111', marginBottom: '10px' }}>
                Motif de la sortie *
              </label>
              <textarea
                id="semis-motif"
                value={formData.motif}
                onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }}
                placeholder="Exemple : Transfert vers un autre site, vente, don, perte, etc."
                required
              />
            </div>
          )}

          {/* Stock source selection — provides variete */}
          <div>
            <label htmlFor="semis-stock" style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: '#111111', marginBottom: '10px' }}>
              Stock source (avec taux de germination) *
            </label>
            <select
              id="semis-stock"
              value={formData.stockRef}
              onChange={(e) => setFormData({ ...formData, stockRef: e.target.value, quantite: '' })}
              style={{
                ...selectStyle,
                borderColor: selectedStock ? '#22c55e' : '#d1d5db',
                borderWidth: selectedStock ? '2px' : '1px',
              }}
              required
            >
              <option value="">Sélectionnez un stock</option>
              {filteredStockList.map(s => {
                const taux = s.tauxGermination != null ? s.tauxGermination : s.tauxManuel;
                return (
                  <option key={s._id} value={s._id}>
                    {s.code} — {s.variete?.nom || '—'} ({s.quantiteRestante?.toLocaleString()} dispo | Germ. {taux}%)
                  </option>
                );
              })}
            </select>

            {/* Show stock details when selected */}
            {selectedStock && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                marginTop: '8px', padding: '12px 16px',
                borderRadius: '8px', fontSize: '14px', fontWeight: 500,
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#006625',
              }}>
                <TestTube size={16} />
                <span>
                  <strong>{selectedStock.code}</strong> — {selectedStock.variete?.nom || 'Variété inconnue'}
                  {' · '}
                  <strong>{selectedStock.quantiteRestante?.toLocaleString()}</strong> graines disponibles
                  {' · Germ. '}
                  <strong>
                    {(() => {
                      const taux = selectedStock.tauxGermination != null ? selectedStock.tauxGermination : selectedStock.tauxManuel;
                      return taux != null ? `${taux}%` : '?';
                    })()}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Quantite */}
          <div>
            <label htmlFor="semis-quantite" style={{ display: 'block', fontSize: '16px', fontWeight: 600, color: '#111111', marginBottom: '10px' }}>
              Quantité à sortir *
            </label>
            <input
              id="semis-quantite"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              value={formData.quantite}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setFormData({ ...formData, quantite: val });
              }}
              style={{
                ...inputStyle,
                borderColor: formData.quantite && selectedStock && parseInt(formData.quantite) > selectedStock.quantiteRestante
                  ? '#ef4444'
                  : formData.quantite
                    ? '#22c55e'
                    : '#d1d5db',
                borderWidth: formData.quantite ? '2px' : '1px',
              }}
              placeholder={selectedStock ? `Max: ${selectedStock.quantiteRestante?.toLocaleString()} graines` : 'Sélectionnez d\'abord un stock'}
              disabled={!selectedStock}
            />
            <style>{`
              #semis-quantite::-webkit-inner-spin-button,
              #semis-quantite::-webkit-outer-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }
              #semis-quantite {
                -moz-appearance: textfield;
              }
            `}</style>
            {formData.quantite && selectedStock && parseInt(formData.quantite) > 0 && (
              <div style={{
                marginTop: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: parseInt(formData.quantite) > selectedStock.quantiteRestante ? '#B02020' : '#006625',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                {parseInt(formData.quantite) > selectedStock.quantiteRestante ? (
                  <>⚠ Dépassement : maximum {selectedStock.quantiteRestante?.toLocaleString()} graines</>
                ) : (
                  <>✓ Restant après sortie : {(selectedStock.quantiteRestante - parseInt(formData.quantite)).toLocaleString()} graines</>
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => navigate('/semis')}
              style={{
                flex: 1,
                padding: '14px',
                backgroundColor: '#f3f4f6',
                color: '#111111',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              style={{
                flex: 2,
                padding: '14px',
                backgroundColor: '#008030',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {formData.type === 'pepiniere' ? 'Sortir en pépinière' : 'Effectuer la sortie externe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  border: '1px solid #d1d5db',
  borderRadius: '10px',
  fontSize: '16px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit'
};

const selectStyle = {
  ...inputStyle,
  backgroundColor: 'white'
};

export default NewSemis;
