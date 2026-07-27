import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Clock } from 'lucide-react';
import Loading from '../components/Loading';
import lotService from '../services/lotService';

const STATUS_CFG = {
  en_cours: { label: 'En cours', color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  pret: { label: 'Prêt', color: '#006625', bg: '#dcfce7', border: '#a7f3d0' },
  recolte: { label: 'Récolté', color: '#006625', bg: '#dcfce7', border: '#a7f3d0' },
  livre: { label: 'Livré', color: '#006625', bg: '#f0fdf4', border: '#bbf7d0' },
  annule: { label: 'Annulé', color: '#991b1b', bg: '#fee2e2', border: '#fecaca' },
};

const cardStyle = {
  backgroundColor: 'white',
  border: '1px solid #C8E6C9',
  borderRadius: '16px',
  padding: '24px',
};

const labelStyle = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#222222',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '4px',
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid #C8E6C9',
  borderRadius: '10px',
  fontSize: '16px',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnPrimary = {
  width: '100%',
  padding: '14px',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'opacity 0.15s',
};

const Badge = ({ children, bg, color }) => (
  <span style={{
    padding: '6px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 700,
    backgroundColor: bg,
    color,
    whiteSpace: 'nowrap',
  }}>
    {children}
  </span>
);

const Field = ({ label, value, valueStyle }) => (
  <div>
    <div style={labelStyle}>{label}</div>
    <p style={{ fontSize: '16px', fontWeight: 600, color: '#222222', margin: '4px 0 0',...(valueStyle || {}) }}>
      {value ?? '-'}
    </p>
  </div>
);

const LotDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, fetchAppData } = useAuth();
  const [lot, setLot] = useState(null);
  const [loading, setLoading] = useState(true);

  // Harvest state
  const [nombrePlantsProduits, setNombrePlantsProduits] = useState('');
  const [useManualHarvest, setUseManualHarvest] = useState(false);
  const [harvestError, setHarvestError] = useState('');

  // Delivery state
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateLivraison, setDateLivraison] = useState(todayStr);
  const [quantiteLivree, setQuantiteLivree] = useState('');
  const [deliveryError, setDeliveryError] = useState('');
  const [autoDelivery, setAutoDelivery] = useState(true);

  // Observation state
  const [noteMessage, setNoteMessage] = useState('');
  const [noteGerminationJ7, setNoteGerminationJ7] = useState('');
  const [noteGerminationJ14, setNoteGerminationJ14] = useState('');

  useEffect(() => {
    fetchLot();
  }, [id]);

  const fetchLot = async () => {
    try {
      setLoading(true);
      const { data } = await lotService.getById(id);
      setLot(data);

      // Auto-calculate default plants produced
      if (data.nombrePlantsProduits > 0) {
        setNombrePlantsProduits(String(data.nombrePlantsProduits));
      } else if (data.quantite) {
        // Use the snapped germination rate on the lot (from the linked stock)
        const germinationRate = data.tauxGermination;
        if (germinationRate != null) {
          setNombrePlantsProduits(String(Math.round((data.quantite * germinationRate) / 100)));
        } else {
          setNombrePlantsProduits(String(data.quantite));
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkHarvest = async () => {
    setHarvestError('');

    if (useManualHarvest) {
      const val = Number(nombrePlantsProduits);
      if (!val || val <= 0) {
        setHarvestError('Veuillez entrer un nombre valide de plantes produites');
        return;
      }
      if (val > lot.quantite) {
        setHarvestError(`Le nombre de plantes produites (${val}) ne peut pas dépasser la quantité plantée (${lot.quantite})`);
        return;
      }
    }

    try {
      const plantsValue = useManualHarvest && nombrePlantsProduits ? Number(nombrePlantsProduits) : null;
      await lotService.markHarvest(lot._id, plantsValue);
      await fetchLot();
      await fetchAppData();
      navigate('/planning');
    } catch (err) {
      setHarvestError(err?.response?.data?.message || 'Erreur lors de la récolte');
    }
  };

  const handleMarkReady = async () => {
    try {
      await lotService.markReady(lot._id);
      await fetchLot();
      await fetchAppData();
      navigate('/planning');
    } catch (err) {
      alert(err?.response?.data?.message || 'Erreur lors du marquage prêt');
    }
  };

  const handleAddNote = async () => {
    try {
      await lotService.addNote(lot._id, {
        message: noteMessage,
        germinationJ7: noteGerminationJ7 ? Number(noteGerminationJ7) : undefined,
        germinationJ14: noteGerminationJ14 ? Number(noteGerminationJ14) : undefined,
      });
      await fetchLot();
      setNoteMessage('');
      setNoteGerminationJ7('');
      setNoteGerminationJ14('');
    } catch (err) {
      alert(err?.response?.data?.message || "Erreur lors de l'ajout de l'observation");
    }
  };

  const handleMarkDelivery = async () => {
    setDeliveryError('');

    let qteLivree;
    if (autoDelivery) {
      qteLivree = lot.nombrePlantsProduits;
    } else {
      qteLivree = Number(quantiteLivree);
      if (quantiteLivree && (!qteLivree || qteLivree <= 0)) {
        setDeliveryError('Veuillez entrer une quantité valide');
        return;
      }
      if (qteLivree > lot.nombrePlantsProduits) {
        setDeliveryError(`La quantité livrée (${qteLivree}) ne peut pas dépasser le nombre de plantes produites (${lot.nombrePlantsProduits})`);
        return;
      }
    }

    try {
      await lotService.markDelivery(lot._id, {
        dateLivraison: dateLivraison ? new Date(dateLivraison).toISOString() : undefined,
        quantiteLivree: qteLivree,
      });
      await fetchLot();
      await fetchAppData();
      navigate('/planning');
    } catch (err) {
      setDeliveryError(err?.response?.data?.message || 'Erreur lors de la livraison');
    }
  };

  if (loading) return <Loading />;
  if (!lot) return (
    <div style={{ textAlign: 'center', padding: '48px' }}>
      <p style={{ fontSize: '16px', color: '#222222' }}>Lot non trouvé</p>
    </div>
  );

  const canMarkReady = lot.statut === 'en_cours';
  const normalizeDate = (d) => { const dt = new Date(d); dt.setHours(0, 0, 0, 0); return dt; };
  const today = normalizeDate(new Date());
  const minDate = lot.expectedReadyDateMin ? normalizeDate(lot.expectedReadyDateMin) : null;
  const maxDate = lot.maturityWindowEnd ? normalizeDate(lot.maturityWindowEnd) : null;
  const isInMaturityWindow = !minDate || (today >= minDate && (!maxDate || today <= maxDate));
  const canHarvest = lot.statut === 'pret' && isInMaturityWindow;
  const canDeliver = lot.statut === 'recolte';
  const canObserve = (lot.statut === 'en_cours' || lot.statut === 'pret');

  // ── Time-based gates for J+7 / J+14 ──
  const daysSincePlanting = lot.dateEntree
    ? Math.floor((new Date() - new Date(lot.dateEntree)) / (1000 * 60 * 60 * 24))
    : 0;
  const j7Unlocked = daysSincePlanting >= 7;
  const j14Unlocked = daysSincePlanting >= 14;
  const statusCfg = STATUS_CFG[lot.statut] || STATUS_CFG.en_cours;

  // ── Derive observations array (backward compat) ──
  let obsArray = [];
  if (Array.isArray(lot.observations)) {
    obsArray = lot.observations;
  } else if (typeof lot.observations === 'string' && lot.observations) {
    obsArray = [{ message: lot.observations }];
  }

  // ── Export observations as PDF ──
  const exportObservationsPDF = () => {
    if (!obsArray.length) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(176, 32, 32);
    doc.rect(0, 0, pageWidth, 2, 'F');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(176, 32, 32);
    doc.text('SICAM AGRI', pageWidth / 2, 14, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Observations — Lot ' + (lot.code || ''), pageWidth / 2, 22, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const lotInfo = [
      ['Variété', lot.semis?.variete?.nom || '-'],
      ['Pépinière', lot.semis?.pepiniere?.nom || '-'],
      ['Date de semis', lot.dateEntree ? new Date(lot.dateEntree).toLocaleDateString('fr-FR') : '-'],
      ['Statut', statusCfg.label],
      ['Extrait par', user?.nom || 'Inconnu'],
      ['Date extraction', new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
    ];

    const infoTableResult = autoTable(doc, {
      body: lotInfo,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 249, 250], textColor: [60, 60, 60] }, 1: { textColor: [80, 80, 80] } },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.2,
    });

    const startY = (infoTableResult?.finalY || 28 + lotInfo.length * 6) + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Historique des observations', pageWidth / 2, startY, { align: 'center' });

    const obsTitleWidth = doc.getTextWidth('Historique des observations');
    doc.setDrawColor(176, 32, 32);
    doc.setLineWidth(0.5);
    doc.line((pageWidth - obsTitleWidth) / 2, startY + 2, (pageWidth + obsTitleWidth) / 2, startY + 2);

    const obsHeaders = ['Date', 'Observateur', 'Note', 'J+7', 'J+14'];
    const obsRows = [...obsArray].reverse().map((obs) => [
      obs.date ? new Date(obs.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
      obs.user?.nom || '-',
      obs.message || '-',
      obs.germinationJ7 != null ? obs.germinationJ7 + '%' : '-',
      obs.germinationJ14 != null ? obs.germinationJ14 + '%' : '-',
    ]);

    autoTable(doc, {
      head: [obsHeaders],
      body: obsRows,
      startY: startY + 5,
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', textColor: [50, 50, 50] },
      headStyles: { fillColor: [176, 32, 32], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 10, right: 10 },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.25,
    });

    doc.save(`observations-${lot.code || 'lot'}.pdf`);
  };

  // ── Compute prediction ──
  let predictedPlants = null;
  let predictedMinDate = null;
  let predictedMaxDate = null;
  if (lot.quantite) {
    // Use the snapped germination rate on the lot (from linked stock)
    const germinationRate = lot.tauxGermination;
    if (germinationRate != null) {
      predictedPlants = Math.round((lot.quantite * germinationRate) / 100);
    }
    if (lot.expectedReadyDateMin) predictedMinDate = lot.expectedReadyDateMin;
    if (lot.expectedReadyDateMax) predictedMaxDate = lot.expectedReadyDateMax;
  }

  // ── Germination color helper ──
  const germColor = (val) => {
    if (val == null) return '#9ca3af';
    if (val >= 70) return '#008030';
    if (val >= 40) return '#8D6E00';
    return '#B02020';
  };

  const germBg = (val) => {
    if (val == null) return '#f3f4f6';
    if (val >= 70) return '#f0fdf4';
    if (val >= 40) return '#fffbeb';
    return '#fef2f2';
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          color: '#222222', fontSize: '14px', fontWeight: 500,
          background: 'none', border: 'none', cursor: 'pointer',
          marginBottom: '20px', padding: '0',
        }}
      >
        Retour
      </button>

      {/* HEADER — Code, badges, key metrics */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#222222', margin: 0 }}>
              {lot.code}
            </h1>
            <Badge bg="#dcfce7" color="#006625">Production</Badge>
            <span style={{
              padding: '6px 14px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 700,
              backgroundColor: statusCfg.bg, color: statusCfg.color,
              border: `1px solid ${statusCfg.border}`,
            }}>
              {statusCfg.label}
            </span>
          </div>
          <span style={{ fontSize: '14px', color: '#111111' }}>
            {lot.dateEntree ? new Date(lot.dateEntree).toLocaleDateString('fr-FR') : ''}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}>
          <Field label="Variété" value={lot.semis?.variete?.nom} />
          <Field label="Pépinière" value={lot.semis?.pepiniere?.nom} />
          <Field label="Quantité plantée" value={lot.quantite} valueStyle={{ fontSize: '22px', fontWeight: 800, color: '#006625' }} />
          <Field label="Statut" value={statusCfg.label} valueStyle={{ color: statusCfg.color, fontWeight: 700 }} />
          {lot.lotSemenceParent && (
            <Field label="Lot parent" value={lot.lotSemenceParent.code} />
          )}
          {lot.expectedReadyDateMin && (
            <Field
              label="Fenêtre de récolte"
              value={`${new Date(lot.expectedReadyDateMin).toLocaleDateString('fr-FR')} → ${new Date(lot.expectedReadyDateMax).toLocaleDateString('fr-FR')}`}
              valueStyle={{ fontSize: '14px', fontWeight: 500 }}
            />
          )}
          {lot.nombrePlantsProduits > 0 && (
            <Field label="Plantes produites" value={lot.nombrePlantsProduits} valueStyle={{ fontSize: '22px', fontWeight: 800, color: '#006625' }} />
          )}
          {lot.dateRecolte && (
            <Field label="Date de récolte" value={new Date(lot.dateRecolte).toLocaleDateString('fr-FR')} />
          )}
          {lot.dateLivraison && (
            <Field label="Date de livraison" value={new Date(lot.dateLivraison).toLocaleDateString('fr-FR')} />
          )}
          {lot.quantiteLivree != null && (
            <Field label="Quantité livrée" value={lot.quantiteLivree} valueStyle={{ fontWeight: 700, color: '#006625' }} />
          )}
        </div>
      </div>

      {/* PRÉVISION vs RÉALITÉ */}
      <div style={{ ...cardStyle, marginBottom: '20px', borderLeft: '4px solid #7c3aed' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#222222', margin: '0 0 16px' }}>
          Prévision vs Réalité
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '16px',
          alignItems: 'start',
        }}>
          <div style={{
            padding: '16px',
            backgroundColor: '#f5f3ff',
            borderRadius: '12px',
            border: '1px solid #ede9fe',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Prévision
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#222222', marginBottom: '2px' }}>Plantes estimées</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#7c3aed' }}>
                  {predictedPlants != null ? predictedPlants : '?'}
                </div>
                {predictedPlants != null && lot.quantite && (
                  <div style={{ fontSize: '12px', color: '#222222', marginTop: '2px' }}>
                    {lot.quantite} graines × taux germination
                  </div>
                )}
              </div>
              {predictedMinDate && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#222222', marginBottom: '2px' }}>Fenêtre de récolte</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111111' }}>
                    {new Date(predictedMinDate).toLocaleDateString('fr-FR')} → {new Date(predictedMaxDate).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#d1d5db' }}>VS</span>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: '#f0fdf4',
            borderRadius: '12px',
            border: '1px solid #dcfce7',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#006625', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Réalité
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#222222', marginBottom: '2px' }}>Plantes produites</div>
                <div style={{
                  fontSize: '24px', fontWeight: 800,
                  color: lot.nombrePlantsProduits > 0 ? '#006625' : '#9ca3af',
                }}>
                  {lot.nombrePlantsProduits > 0 ? lot.nombrePlantsProduits : '—'}
                </div>
                {lot.nombrePlantsProduits > 0 && predictedPlants != null && (
                  <div style={{ fontSize: '12px', marginTop: '2px', fontWeight: 600, color: lot.nombrePlantsProduits >= predictedPlants ? '#008030' : '#B02020' }}>
                    {lot.nombrePlantsProduits >= predictedPlants
                      ? `+${lot.nombrePlantsProduits - predictedPlants} vs prévision`
                      : `${lot.nombrePlantsProduits - predictedPlants} vs prévision`
                    }
                  </div>
                )}
              </div>
              {lot.dateRecolte && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#222222', marginBottom: '2px' }}>Date de récolte</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111111' }}>
                    {new Date(lot.dateRecolte).toLocaleDateString('fr-FR')}
                  </div>
                  {predictedMinDate && (
                    <div style={{ fontSize: '12px', marginTop: '2px', color: '#222222' }}>
                      {new Date(lot.dateRecolte) < new Date(predictedMinDate)
                        ? 'Avancée (+ tôt que prévu)'
                        : new Date(lot.dateRecolte) > new Date(predictedMaxDate)
                        ? 'Retard (+ tard que prévu)'
                        : '[OK] Dans la fenêtre prévue'
                      }
                    </div>
                  )}
                </div>
              )}
              {!lot.dateRecolte && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#222222', marginBottom: '2px' }}>Date de récolte</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111111' }}>Pas encore récolté</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mark Ready Card */}
      {canMarkReady && !lot.expectedReadyDateMin && (
        <div style={{ ...cardStyle, marginBottom: '20px', borderLeft: '4px solid #f59e0b' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#222222', margin: '0 0 12px' }}>
            Préparer pour la récolte
          </h2>
          <p style={{ fontSize: '14px', color: '#222222', margin: '0 0 16px' }}>
            Aucun cycle de production configuré. Vous pouvez marquer manuellement ce lot comme prêt.
          </p>
          <button onClick={handleMarkReady}
            style={{ ...btnPrimary, backgroundColor: '#f59e0b' }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            ✓ Marquer prêt pour la récolte
          </button>
        </div>
      )}
      {canMarkReady && lot.expectedReadyDateMin && (
        <div style={{ ...cardStyle, marginBottom: '20px', borderLeft: '4px solid #008030' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#222222', margin: '0 0 12px' }}>
            Prêt automatique
          </h2>
          <p style={{ fontSize: '14px', color: '#222222', margin: '0 0 8px' }}>
            Ce lot sera automatiquement marqué comme prêt à la récolte lorsque sa date de maturité sera atteinte.
          </p>
          {lot.expectedReadyDateMin && (
            <div style={{
              padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px',
              fontSize: '14px', color: '#006625',
            }}>
              <strong>Date de prêt prévue :</strong>{new Date(lot.expectedReadyDateMin).toLocaleDateString('fr-FR')}
              {' → '}
              {new Date(lot.expectedReadyDateMax).toLocaleDateString('fr-FR')}
            </div>
          )}
        </div>
      )}

      {/* Maturity window info */}
      {lot.statut === 'pret' && !isInMaturityWindow && lot.expectedReadyDateMin && (
        <div style={{ ...cardStyle, marginBottom: '20px', borderLeft: '4px solid #f59e0b' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#222222', margin: '0 0 12px' }}>
            <Clock size={20} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Fenêtre de maturité
          </h2>
          {today < new Date(lot.expectedReadyDateMin) ? (
            <div>
              <p style={{ fontSize: '14px', color: '#222222', margin: '0 0 8px' }}>
                Ce lot n'a pas encore atteint sa fenêtre de maturité. La récolte sera disponible à partir du :
              </p>
              <div style={{
                padding: '12px', backgroundColor: '#fffbeb', borderRadius: '8px',
                fontSize: '15px', fontWeight: 700, color: '#92400e',
              }}>
                {new Date(lot.expectedReadyDateMin).toLocaleDateString('fr-FR')}
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '14px', color: '#222222', margin: '0 0 8px' }}>
                La fenêtre de maturité de ce lot est dépassée (expirée le :
              </p>
              <div style={{
                padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px',
                fontSize: '15px', fontWeight: 700, color: '#991b1b',
              }}>
                {new Date(lot.maturityWindowEnd).toLocaleDateString('fr-FR')}
              </div>
              <p style={{ fontSize: '13px', color: '#111111', margin: '8px 0 0' }}>
                Contactez un administrateur si vous devez tout de même récolter ce lot.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Harvest Card */}
      {canHarvest && (
        <div style={{ ...cardStyle, marginBottom: '20px', borderLeft: '4px solid #008030' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#222222', margin: '0 0 16px' }}>
            Récolte
          </h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button onClick={() => { setUseManualHarvest(false); setHarvestError(''); }}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer',
                border: !useManualHarvest ? '2px solid #008030' : '1px solid #d1d5db',
                backgroundColor: !useManualHarvest ? '#f0fdf4' : 'white',
                color: !useManualHarvest ? '#008030' : '#6b7280',
              }}
            >Automatique</button>
            <button onClick={() => { setUseManualHarvest(true); setHarvestError(''); }}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer',
                border: useManualHarvest ? '2px solid #1565C0' : '1px solid #d1d5db',
                backgroundColor: useManualHarvest ? '#f0f9ff' : 'white',
                color: useManualHarvest ? '#1565C0' : '#6b7280',
              }}
            >Manuel</button>
          </div>
          {!useManualHarvest && (
            <div style={{ padding: '14px', backgroundColor: '#f9fafb', borderRadius: '10px', marginBottom: '16px', fontSize: '14px', color: '#111111', lineHeight: '1.5' }}>
              Calcul automatique à partir du taux de germination enregistré (stock source).
              {lot.quantite && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#222222' }}>
                  {lot.quantite} graines × taux de germination {lot.tauxGermination != null ? `(${lot.tauxGermination}%)` : ''}
                  = <strong style={{ color: '#006625' }}>{nombrePlantsProduits || '?'} plantes</strong>
                </div>
              )}
            </div>
          )}
          {useManualHarvest && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#222222', marginBottom: '8px' }}>
                Nombre de plantes produites
              </label>
              <input type="number" min="0" max={lot.quantite}
                value={nombrePlantsProduits} onChange={(e) => setNombrePlantsProduits(e.target.value)}
                style={inputStyle} placeholder={`Max: ${lot.quantite}`} />
              <p style={{ fontSize: '12px', color: '#111111', margin: '6px 0 0' }}>
                Maximum : <strong>{lot.quantite}</strong> (quantité plantée)
              </p>
            </div>
          )}
          {harvestError && (
            <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px', marginBottom: '12px' }}>
              {harvestError}
            </div>
          )}
          <button onClick={handleMarkHarvest}
            style={{ ...btnPrimary, backgroundColor: '#008030' }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            {useManualHarvest ? 'Récolter (manuel)' : 'Récolter (automatique)'}
          </button>
        </div>
      )}

      {/* Observation Form */}
      {canObserve && (
        <div style={{ ...cardStyle, marginBottom: '20px', borderLeft: '4px solid #1565C0' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#222222', margin: '0 0 16px' }}>
            Observation & Suivi
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#222222', marginBottom: '8px' }}>
                Note / Observation
              </label>
              <textarea value={noteMessage} onChange={(e) => setNoteMessage(e.target.value)}
                rows={3} style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                placeholder="Ex: Les plants montrent une bonne vigueur..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#222222', marginBottom: '8px' }}>
                  Germination J+7 (%)
                  {!j7Unlocked && (
                    <span style={{ fontSize: '11px', fontWeight: 400, color: '#111111', marginLeft: '6px' }}>
                      (débloqué dans {7 - daysSincePlanting}j)
                    </span>
                  )}
                </label>
                <input type="number" min="0" max="100"
                  value={noteGerminationJ7}
                  onChange={(e) => setNoteGerminationJ7(e.target.value === '' ? '' : String(Math.min(100, Math.max(0, Number(e.target.value)))))}
                  disabled={!j7Unlocked}
                  style={{ ...inputStyle, opacity: j7Unlocked ? 1 : 0.5, cursor: j7Unlocked ? 'text' : 'not-allowed', backgroundColor: j7Unlocked ? 'white' : '#f9fafb' }}
                  placeholder={j7Unlocked ? 'Ex: 85' : 'Encore ' + (7 - daysSincePlanting) + ' jours'} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#222222', marginBottom: '8px' }}>
                  Germination J+14 (%)
                  {!j14Unlocked && (
                    <span style={{ fontSize: '11px', fontWeight: 400, color: '#111111', marginLeft: '6px' }}>
                      (débloqué dans {14 - daysSincePlanting}j)
                    </span>
                  )}
                </label>
                <input type="number" min="0" max="100"
                  value={noteGerminationJ14}
                  onChange={(e) => setNoteGerminationJ14(e.target.value === '' ? '' : String(Math.min(100, Math.max(0, Number(e.target.value)))))}
                  disabled={!j14Unlocked}
                  style={{ ...inputStyle, opacity: j14Unlocked ? 1 : 0.5, cursor: j14Unlocked ? 'text' : 'not-allowed', backgroundColor: j14Unlocked ? 'white' : '#f9fafb' }}
                  placeholder={j14Unlocked ? 'Ex: 90' : 'Encore ' + (14 - daysSincePlanting) + ' jours'} />
              </div>
            </div>
            <button onClick={handleAddNote}
              disabled={!noteMessage && !noteGerminationJ7 && !noteGerminationJ14}
              style={{
                ...btnPrimary,
                backgroundColor: (!noteMessage && !noteGerminationJ7 && !noteGerminationJ14) ? '#d1d5db' : '#1565C0',
                cursor: (!noteMessage && !noteGerminationJ7 && !noteGerminationJ14) ? 'not-allowed' : 'pointer',
              }}
            >
              Enregistrer l'observation
            </button>
          </div>
        </div>
      )}

      {/* Delivery Card */}
      {canDeliver && (
        <div style={{ ...cardStyle, marginBottom: '20px', borderLeft: '4px solid #1565C0' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#222222', margin: '0 0 16px' }}>
            Livraison
          </h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button onClick={() => { setAutoDelivery(true); setDeliveryError(''); }}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer',
                border: autoDelivery ? '2px solid #008030' : '1px solid #d1d5db',
                backgroundColor: autoDelivery ? '#f0fdf4' : 'white',
                color: autoDelivery ? '#008030' : '#6b7280',
              }}
            >Automatique</button>
            <button onClick={() => { setAutoDelivery(false); setDeliveryError(''); }}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer',
                border: !autoDelivery ? '2px solid #1565C0' : '1px solid #d1d5db',
                backgroundColor: !autoDelivery ? '#f0f9ff' : 'white',
                color: !autoDelivery ? '#1565C0' : '#6b7280',
              }}
            >Manuel</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#222222', marginBottom: '8px' }}>
                Date de livraison
              </label>
              <input type="date" value={dateLivraison} onChange={(e) => setDateLivraison(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#222222', marginBottom: '8px' }}>
                Quantité livrée
              </label>
              {autoDelivery ? (
                <div style={{ padding: '14px', backgroundColor: '#f9fafb', borderRadius: '10px', fontSize: '14px', color: '#111111', lineHeight: '1.5' }}>
                  Livraison complète automatique :
                  <div style={{ marginTop: '8px', fontSize: '18px', fontWeight: 800, color: '#006625' }}>
                    {lot.nombrePlantsProduits || '?'} plantes
                  </div>
                  <div style={{ fontSize: '12px', color: '#222222', marginTop: '4px' }}>
                    La totalité des plantes produites sera livrée.
                  </div>
                </div>
              ) : (
                <>
                  <input type="number" min="0" max={lot.nombrePlantsProduits}
                    value={quantiteLivree} onChange={(e) => setQuantiteLivree(e.target.value)}
                    style={inputStyle} placeholder={`Max: ${lot.nombrePlantsProduits}`} />
                  <p style={{ fontSize: '12px', color: '#111111', margin: '6px 0 0' }}>
                    Maximum : <strong>{lot.nombrePlantsProduits}</strong> (plantes produites)
                  </p>
                </>
              )}
            </div>
            {deliveryError && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '14px' }}>
                {deliveryError}
              </div>
            )}
            <button onClick={handleMarkDelivery}
              style={{ ...btnPrimary, backgroundColor: '#1565C0' }}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              {autoDelivery ? 'Livrer (quantité complète)' : 'Marquer comme livré'}
            </button>
          </div>
        </div>
      )}

      {/* Suivi Germination */}
      {(lot.germinationJ7 != null || lot.germinationJ14 != null) && (
        <div style={{ ...cardStyle, marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#222222', margin: '0 0 16px' }}>
            Suivi Germination
          </h2>
          <div style={{ display: 'flex', gap: '16px' }}>
            {lot.germinationJ7 != null && (
              <div style={{ flex: 1, padding: '16px', backgroundColor: germBg(lot.germinationJ7), borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', marginBottom: '4px' }}>J+7</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: germColor(lot.germinationJ7) }}>{lot.germinationJ7}%</div>
              </div>
            )}
            {lot.germinationJ14 != null && (
              <div style={{ flex: 1, padding: '16px', backgroundColor: germBg(lot.germinationJ14), borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#222222', textTransform: 'uppercase', marginBottom: '4px' }}>J+14</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: germColor(lot.germinationJ14) }}>{lot.germinationJ14}%</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Observations History */}
      {obsArray.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#222222', margin: 0 }}>
              Historique des observations
            </h2>
            <button onClick={exportObservationsPDF}
              style={{ padding: '8px 14px', backgroundColor: 'white', color: '#111111', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}
            >
               Exporter observations
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[...obsArray].reverse().map((obs, idx) => (
              <div key={idx} style={{ padding: '14px', border: '1px solid #f3f4f6', borderRadius: '10px', backgroundColor: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    {obs.message && <p style={{ fontSize: '14px', color: '#111111', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>{obs.message}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                    {obs.date && <p style={{ fontSize: '11px', color: '#111111', margin: 0 }}>{new Date(obs.date).toLocaleString('fr-FR')}</p>}
                    {obs.user?.nom && <p style={{ fontSize: '11px', color: '#111111', margin: '2px 0 0' }}>{obs.user.nom}</p>}
                  </div>
                </div>
                {(obs.germinationJ7 != null || obs.germinationJ14 != null) && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {obs.germinationJ7 != null && (
                      <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, backgroundColor: germBg(obs.germinationJ7), color: germColor(obs.germinationJ7) }}>
                        J+7 : {obs.germinationJ7}%
                      </span>
                    )}
                    {obs.germinationJ14 != null && (
                      <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, backgroundColor: germBg(obs.germinationJ14), color: germColor(obs.germinationJ14) }}>
                        J+14 : {obs.germinationJ14}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Associated Production Lots */}
      {lot.lotsProduction?.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#222222', margin: '0 0 16px' }}>
            Lots de production associés
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {lot.lotsProduction.map((prodLot) => (
              <Link key={prodLot._id} to={`/lots/${prodLot._id}`} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '14px', border: '1px solid #f3f4f6', borderRadius: '10px', backgroundColor: 'white', cursor: 'pointer', transition: 'background-color 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: '#006625', margin: 0 }}>{prodLot.code}</p>
                      <p style={{ fontSize: '12px', color: '#222222', margin: '2px 0 0' }}>{prodLot.quantite} graines — {new Date(prodLot.dateEntree).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <Badge bg="#dcfce7" color="#006625">Production</Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LotDetail;
