/**
 * Alert Calculations — Compute dashboard alerts from raw data
 * 
 * Generates alert objects for:
 * - Low germination rates
 * - Overdue harvest
 * - Maturity exceeded
 * - Pending delivery
 * - Inactive nurseries
 * - Depleted stock
 * - Low stock
 * - Stock health issues
 */

export const ALERT_STORAGE_KEY = 'pep_dismissed_alerts';

/**
 * Compute alerts from data — reusable for badge count + display
 * Each alert has a unique `key` for dismiss tracking.
 */
export const computeAlerts = (lots, pepinieres, semis, stock, stockHealth) => {
  const alerts = [];
  const now = new Date();

  // ── Lots avec faible germination ──
  const lotsFaibles = (lots || []).filter((lot) => {
    if (!lot) return false;
    let rate = null;
    if (lot.tests && lot.tests.length > 0) {
      const t = lot.tests[0];
      if (t && t.grainesTestes > 0) rate = (t.grainesGermees / t.grainesTestes) * 100;
    } else if (lot.tauxManuel != null) {
      rate = lot.tauxManuel;
    }
    return rate !== null && rate < 40;
  });
  lotsFaibles.slice(0, 5).forEach((lot) => {
    let rate = null;
    if (lot.tests && lot.tests.length > 0) {
      const t = lot.tests[0];
      if (t && t.grainesTestes > 0) rate = Math.round((t.grainesGermees / t.grainesTestes) * 100);
    } else if (lot.tauxManuel != null) {
      rate = lot.tauxManuel;
    }
    alerts.push({
      key: `low-germ-${lot._id}`,
      severity: 'warning',
      icon: '',
      title: `${lot.code} — Taux de germination faible`,
      desc: `${lot.semis?.pepiniere?.nom || lot.pepiniere?.nom || '—'} · ${lot.semis?.variete?.nom || lot.variete?.nom || '—'}`,
      action: { to: `/lots/${lot._id}`, label: 'Voir' },
      detail: [
        { label: 'Type', value: 'Production' },
        { label: 'Taux de germination', value: rate !== null ? `${rate}%` : '—' },
        { label: 'Quantité testée', value: lot.quantite ? `${lot.quantite} graines` : '—' },
        { label: "Date d'entrée", value: lot.dateEntree ? new Date(lot.dateEntree).toLocaleDateString('fr-FR') : '—' },
        { label: 'Seuil critique', value: '< 40%' },
      ],
    });
  });

  // ── Lots en pret qui dépassent leur fenetre de recolte ──
  const lotsOverdueRecolte = (lots || []).filter((lot) => {
    if (!lot || lot.type !== 'production') return false;
    if (lot.statut !== 'pret') return false;
    if (!lot.expectedReadyDateMax) return false;
    return now > new Date(lot.expectedReadyDateMax);
  });
  lotsOverdueRecolte.slice(0, 5).forEach((lot) => {
    const overdueDays = Math.floor((now - new Date(lot.expectedReadyDateMax)) / (1000 * 60 * 60 * 24));
    alerts.push({
      key: `overdue-harvest-${lot._id}`,
      severity: 'critical',
      icon: '',
      title: `${lot.code} — Récolte en retard (${overdueDays}j)`,
      desc: `${lot.semis?.variete?.nom || '—'} · Prêt depuis le ${new Date(lot.expectedReadyDateMax).toLocaleDateString('fr-FR')}`,
      action: { to: `/lots/${lot._id}`, label: 'Récolter' },
      detail: [
        { label: 'Type', value: 'Lot de production' },
        { label: 'Variété', value: lot.semis?.variete?.nom || '—' },
        { label: 'Pépinière', value: lot.semis?.pepiniere?.nom || '—' },
        { label: 'Retard', value: `${overdueDays} jour(s)` },
        { label: 'Fenêtre attendue', value: `${new Date(lot.expectedReadyDateMin).toLocaleDateString('fr-FR')} → ${new Date(lot.expectedReadyDateMax).toLocaleDateString('fr-FR')}` },
        { label: 'Quantité plantée', value: `${lot.quantite || '?'} graines` },
      ],
    });
  });

  // ── Lots en_cours qui ont depasse leur fenetre de maturite ──
  const lotsMaturiteDepassee = (lots || []).filter((lot) => {
    if (!lot || lot.type !== 'production') return false;
    if (lot.statut !== 'en_cours') return false;
    if (!lot.expectedReadyDateMax) return false;
    return now > new Date(lot.expectedReadyDateMax);
  });
  lotsMaturiteDepassee.slice(0, 5).forEach((lot) => {
    const pastDays = Math.floor((now - new Date(lot.expectedReadyDateMax)) / (1000 * 60 * 60 * 24));
    alerts.push({
      key: `maturity-${lot._id}`,
      severity: 'critical',
      icon: '',
      title: `${lot.code} — Maturité dépassée (${pastDays}j)`,
      desc: `Devait être prêt avant le ${new Date(lot.expectedReadyDateMax).toLocaleDateString('fr-FR')}`,
      action: { to: `/lots/${lot._id}`, label: 'Voir' },
      detail: [
        { label: 'Type', value: 'Lot de production (en cours)' },
        { label: 'Variété', value: lot.semis?.variete?.nom || '—' },
        { label: 'Pépinière', value: lot.semis?.pepiniere?.nom || '—' },
        { label: 'Dépassement', value: `${pastDays} jour(s)` },
        { label: 'Date de semis', value: lot.dateEntree ? new Date(lot.dateEntree).toLocaleDateString('fr-FR') : '—' },
        { label: 'Fenêtre attendue', value: lot.expectedReadyDateMin ? `${new Date(lot.expectedReadyDateMin).toLocaleDateString('fr-FR')} → ${new Date(lot.expectedReadyDateMax).toLocaleDateString('fr-FR')}` : '—' },
      ],
    });
  });

  // ── Lots recoltes mais non livres depuis plus de 7 jours ──
  const lotsLivraisonEnRetard = (lots || []).filter((lot) => {
    if (!lot || lot.type !== 'production') return false;
    if (lot.statut !== 'recolte') return false;
    if (!lot.dateRecolte) return false;
    const daysSinceHarvest = Math.floor((now - new Date(lot.dateRecolte)) / (1000 * 60 * 60 * 24));
    return daysSinceHarvest >= 7;
  });
  lotsLivraisonEnRetard.slice(0, 5).forEach((lot) => {
    const daysSinceHarvest = Math.floor((now - new Date(lot.dateRecolte)) / (1000 * 60 * 60 * 24));
    alerts.push({
      key: `delivery-${lot._id}`,
      severity: 'warning',
      icon: '',
      title: `${lot.code} — Livraison en attente (J+${daysSinceHarvest})`,
      desc: `Récolté le ${new Date(lot.dateRecolte).toLocaleDateString('fr-FR')} — ${lot.nombrePlantsProduits || '?'} plants à livrer`,
      action: { to: `/lots/${lot._id}`, label: 'Livrer' },
      detail: [
        { label: 'Type', value: 'Lot de production (récolté)' },
        { label: 'Variété', value: lot.semis?.variete?.nom || '—' },
        { label: 'Pépinière', value: lot.semis?.pepiniere?.nom || '—' },
        { label: 'Jours depuis récolte', value: `J+${daysSinceHarvest}` },
        { label: 'Date de récolte', value: lot.dateRecolte ? new Date(lot.dateRecolte).toLocaleDateString('fr-FR') : '—' },
        { label: 'Plants à livrer', value: `${lot.nombrePlantsProduits || '?'} plants` },
        { label: 'Quantité plantée', value: `${lot.quantite || '?'} graines` },
      ],
    });
  });

  // ── Pépinières non actives ──
  const pepInactives = (pepinieres || []).filter(p => p && p.statut !== 'actif');
  pepInactives.slice(0, 5).forEach((p) => {
    alerts.push({
      key: `inactive-pep-${p._id}`,
      severity: 'info',
      icon: '',
      title: `${p.nom} — Pépinière inactive`,
      desc: p.code || '—',
      action: { to: `/pepinieres`, label: 'Voir' },
      detail: [
        { label: 'Code', value: p.code || '—' },
        { label: 'Statut', value: p.statut || '—' },
        { label: 'Adresse', value: p.address || 'Non renseignée' },
        { label: 'Surface', value: '—' },
        { label: 'Contact', value: p.email || p.number || '—' },
      ],
    });
  });

  // ── Semis stock alerts ──
  // 1. Semis épuisés
  const semisEpuises = (semis || []).filter(s => s && s.quantite > 0 && (s.disponible || 0) <= 0);
  semisEpuises.slice(0, 5).forEach((s) => {
    const taux = s.quantite > 0 ? Math.round(((s.quantiteUtilisee || 0) / s.quantite) * 100) : 100;
    alerts.push({
      key: `stock-epuise-${s._id}`,
      severity: 'critical',
      icon: '',
      title: `${s.code || '—'} — Stock épuisé`,
      desc: `${s.variete?.nom || '?'} · ${s.pepiniere?.nom || '?'} · Utilisation ${taux}%`,
      action: { to: `/semis/${s._id}`, label: 'Voir' },
      detail: [
        { label: 'Variété', value: s.variete?.nom || '—' },
        { label: 'Pépinière', value: s.pepiniere?.nom || '—' },
        { label: 'Quantité reçue', value: `${s.quantite || 0} graines` },
        { label: 'Quantité utilisée', value: `${s.quantiteUtilisee || 0} graines` },
        { label: 'Disponible', value: '0 graine' },
        { label: "Taux d'utilisation", value: `${taux}%` },
        { label: 'Statut', value: 'Épuisé — Aucun stock restant' },
      ],
    });
  });

  // 2. Semis presque épuisés (>= 80%)
  const semisBientotEpuises = (semis || []).filter(s => {
    if (!s || s.quantite <= 0) return false;
    const dispo = s.disponible || 0;
    if (dispo <= 0) return false;
    return ((s.quantiteUtilisee || 0) / s.quantite * 100) >= 80;
  });
  semisBientotEpuises.slice(0, 5).forEach((s) => {
    const dispo = s.disponible || 0;
    const taux = Math.round(((s.quantiteUtilisee || 0) / s.quantite) * 100);
    alerts.push({
      key: `stock-bientot-epuise-${s._id}`,
      severity: 'warning',
      icon: '',
      title: `${s.code || '—'} — Stock presque épuisé (${taux}%)`,
      desc: `${s.variete?.nom || '?'} · ${s.pepiniere?.nom || '?'} · ${dispo} graine(s) restante(s)`,
      action: { to: `/semis/${s._id}`, label: 'Voir' },
      detail: [
        { label: 'Variété', value: s.variete?.nom || '—' },
        { label: 'Pépinière', value: s.pepiniere?.nom || '—' },
        { label: 'Quantité reçue', value: `${s.quantite || 0} graines` },
        { label: 'Quantité utilisée', value: `${s.quantiteUtilisee || 0} graines` },
        { label: 'Disponible', value: `${dispo} graine(s)` },
        { label: "Taux d'utilisation", value: `${taux}%` },
        { label: "Seuil d'alerte", value: '≥ 80%' },
      ],
    });
  });

  // ── Warehouse Stock alerts (StockSemence) ──
  const stockList = stock || [];
  
  // Stocks with utilisation >= 80%
  const stockLow = stockList.filter(s => {
    if (!s) return false;
    const used = (s.quantiteInitiale || 0) - (s.quantiteRestante || 0);
    const pct = s.quantiteInitiale > 0 ? Math.round((used / s.quantiteInitiale) * 100) : 0;
    const dispo = s.quantiteRestante || 0;
    return pct >= 80 && dispo > 0;
  });
  stockLow.slice(0, 5).forEach(s => {
    const used = (s.quantiteInitiale || 0) - (s.quantiteRestante || 0);
    const pct = s.quantiteInitiale > 0 ? Math.round((used / s.quantiteInitiale) * 100) : 100;
    const dispo = s.quantiteRestante || 0;
    alerts.push({
      key: `stock-low-${s._id}`,
      severity: 'warning',
      icon: '',
      title: `${s.code || '—'} — Stock magasin presque épuisé (${pct}%)`,
      desc: `${s.variete?.nom || '?'} · ${dispo} graine(s) restante(s)`,
      action: { to: `/stock/${s._id}`, label: 'Voir' },
      detail: [
        { label: 'Variété', value: s.variete?.nom || '—' },
        { label: 'Code stock', value: s.code || '—' },
        { label: 'Quantité initiale', value: `${s.quantiteInitiale || 0} graines` },
        { label: 'Quantité restante', value: `${dispo} graines` },
        { label: "Taux d'utilisation", value: `${pct}%` },
        { label: "Seuil d'alerte", value: '≥ 80% (moins de 20% restant)' },
      ],
    });
  });

  // Stocks complètement épuisés
  const stockEpuise = stockList.filter(s => {
    if (!s) return false;
    return (s.quantiteRestante || 0) <= 0 && (s.quantiteInitiale || 0) > 0;
  });
  stockEpuise.slice(0, 5).forEach(s => {
    alerts.push({
      key: `stock-epuise-wh-${s._id}`,
      severity: 'critical',
      icon: '',
      title: `${s.code || '—'} — Stock magasin épuisé`,
      desc: `${s.variete?.nom || '?'} · ${s.quantiteInitiale || 0} graines reçues, tout utilisé`,
      action: { to: `/stock/${s._id}`, label: 'Voir' },
      detail: [
        { label: 'Variété', value: s.variete?.nom || '—' },
        { label: 'Code stock', value: s.code || '—' },
        { label: 'Quantité initiale', value: `${s.quantiteInitiale || 0} graines` },
        { label: 'Quantité restante', value: '0 graine' },
        { label: 'Statut', value: 'Épuisé — Aucun stock restant' },
      ],
    });
  });

  // ── Stock Health alerts ──
  if (stockHealth?.varieteAlerts) {
    stockHealth.varieteAlerts.forEach((va) => {
      const key = `stockhealth-${va.type}-${va.variete?._id || ''}`;
      const vName = va.variete?.nom || 'Variété inconnue';
      const vCode = va.variete?.code || '';
      
      if (va.type === 'low_stock') {
        alerts.push({
          key, severity: va.severity,
          icon: va.reste === 0 ? '' : '',
          title: va.reste === 0 ? `${vName} — Stock épuisé` : `${vName} — Stock faible`,
          desc: `${vCode} · ${va.reste} graine(s) restante(s)`,
          action: { to: `/stock`, label: 'Voir stock' },
          detail: [
            { label: 'Variété', value: vName },
            { label: 'Code', value: vCode || '—' },
            { label: 'Graines restantes', value: va.reste === 0 ? '0 (épuisé)' : `${va.reste} graines` },
            { label: "Seuil d'alerte", value: 'Stock bas (< 200 graines)' },
            { label: 'Action recommandée', value: 'Prévoir un réapprovisionnement' },
          ],
        });
      } else if (va.type === 'no_germination') {
        alerts.push({
          key, severity: 'warning', icon: '',
          title: `${vName} — Aucun taux de germination`,
          desc: `${vCode} · Test de germination requis avant sortie en pépinière`,
          action: { to: `/stock`, label: 'Ajouter un test' },
          detail: [
            { label: 'Variété', value: vName },
            { label: 'Code', value: vCode || '—' },
            { label: 'Problème', value: 'Aucun test de germination effectué' },
            { label: 'Impact', value: 'Impossible de sortir en pépinière sans taux de germination' },
            { label: 'Action recommandée', value: 'Ajouter un test de germination ou un taux manuel' },
          ],
        });
      } else if (va.type === 'bad_germination') {
        alerts.push({
          key, severity: 'critical', icon: '',
          title: `${vName} — Taux germination très bas (${va.taux}%)`,
          desc: `${vCode} · En dessous du seuil de rentabilité (< 40%)`,
          action: { to: `/stock`, label: 'Voir stock' },
          detail: [
            { label: 'Variété', value: vName },
            { label: 'Code', value: vCode || '—' },
            { label: 'Taux de germination', value: `${va.taux}%` },
            { label: 'Seuil critique', value: '< 40%' },
            { label: 'Impact', value: 'Taux trop bas pour une production rentable' },
            { label: 'Action recommandée', value: 'Envisager un nouveau lot de semences' },
          ],
        });
      }
    });
  }

  return alerts;
};

/**
 * Load dismissed alert keys from localStorage
 */
export const loadDismissedAlerts = () => {
  try {
    const stored = localStorage.getItem(ALERT_STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

/**
 * Save dismissed alert keys to localStorage
 */
export const saveDismissedAlerts = (dismissedSet) => {
  try {
    localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify([...dismissedSet]));
  } catch { /* localStorage full or unavailable */ }
};

/**
 * Clear all dismissed alerts
 */
export const clearDismissedAlerts = () => {
  try {
    localStorage.removeItem(ALERT_STORAGE_KEY);
  } catch { /* ignore */ }
};
