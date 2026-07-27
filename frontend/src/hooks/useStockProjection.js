/**
 * useStockProjection — Hook for Stock Glissant Date Projection
 * ==============================================================
 *
 * Takes the current lots and an offset in days, and computes projected
 * statuses for each production lot at the projected date.
 *
 * Returns KPIs and comparatif data that can drive the dashboard.
 */

import { useMemo } from 'react';

/* ── Constants (match the HTML design) ── */
const DELAI_ORANGE = 7;   // Days after "Prêt" before urgent
const DELAI_ROUGE  = 12;  // Days after "Prêt" before hors délai

/**
 * Compute the projected stage for a production lot at a given date.
 *
 * @param {Object} lot - The production lot
 * @param {Date} projDate - The projected date
 * @returns {Object} { stade, color, urgence, urgenceClass, pct }
 */
function getProjectedStade(lot, projDate) {
  // Already delivered — stays delivered
  if (lot.statut === 'livre') {
    return { stade: 'Livré', color: 'blue', urgence: null, pct: 100 };
  }

  const dateEntree = lot.dateEntree ? new Date(lot.dateEntree) : null;
  if (!dateEntree) {
    return { stade: 'Inconnu', color: 'gray', urgence: null, pct: 0 };
  }

  // Calculate age in days at the projected date
  const age = Math.round((projDate - dateEntree) / 86400000);

  // Not yet started
  if (age < 0) {
    return { stade: 'Pas encore commencé', color: 'gray', urgence: null, pct: 0 };
  }

  // Use expectedReadyDateMin if available, otherwise fall back to a default duration
  const readyDateMin = lot.expectedReadyDateMin ? new Date(lot.expectedReadyDateMin) : null;
  const dureePepiniere = readyDateMin
    ? Math.round((readyDateMin - dateEntree) / 86400000)
    : 38; // Default fallback (matches HTML design)

  // Use maturityWindowEnd if available for late stage calculation
  const maturityEnd = lot.maturityWindowEnd ? new Date(lot.maturityWindowEnd) : null;
  const delaiOrange = maturityEnd
    ? Math.round((maturityEnd - dateEntree) / 86400000)
    : dureePepiniere + DELAI_ORANGE;
  const delaiRouge = maturityEnd
    ? Math.round((maturityEnd - dateEntree) / 86400000) + (DELAI_ROUGE - DELAI_ORANGE)
    : dureePepiniere + DELAI_ROUGE;

  const pct = Math.min(100, Math.round((age / dureePepiniere) * 100));

  // Growth phases
  if (age < 7) {
    return { stade: 'Semis / Germination', age, color: 'gray', pct, urgence: null };
  }
  if (age < 14) {
    return { stade: 'Contrôle J+7', age, color: 'gray', pct, urgence: null };
  }
  if (age < Math.round(dureePepiniere * 0.6)) {
    return { stade: 'Croissance S1', age, color: 'gray', pct, urgence: null };
  }
  if (age < dureePepiniere) {
    return { stade: 'Croissance S2', age, color: 'gray', pct, urgence: null };
  }

  // Past the normal production duration
  const ageApresPret = age - dureePepiniere;

  if (ageApresPret <= DELAI_ORANGE) {
    return {
      stade: 'Prêt à livrer', age, color: 'green', pct: 100,
      urgence: `J+${ageApresPret} après maturité`,
      urgenceClass: 'ok',
    };
  }
  if (ageApresPret <= DELAI_ROUGE) {
    return {
      stade: 'Livraison urgente', age, color: 'orange', pct: 100,
      urgence: `J+${ageApresPret} — urgent !`,
      urgenceClass: 'warn',
    };
  }
  return {
    stade: 'Hors délai ⚠️', age, color: 'red', pct: 100,
    urgence: `J+${ageApresPret} — risque qualité !`,
    urgenceClass: 'danger',
  };
}

/**
 * Compute comparatif data (livré vs planifié) from lots.
 *
 * @param {Array} lots - Production lots
 * @param {Object} pepMap - Pepiniere ID → name mapping
 * @returns {Array} Comparatif data sorted by delivery rate ascending
 */
function computeComparatif(lots, pepMap) {
  const totals = {};

  lots.forEach((lot) => {
    const pepId =
      lot.semis?.pepiniere?._id ||
      lot.semis?.pepiniere ||
      lot.pepiniere?._id ||
      lot.pepiniere;
    if (!pepId) return;

    if (!totals[pepId]) totals[pepId] = { planned: 0, delivered: 0 };
    totals[pepId].planned += lot.quantite || 0;
    if (lot.statut === 'livre') {
      totals[pepId].delivered += lot.quantite || 0;
    }
  });

  const result = Object.entries(totals).map(([pepId, data]) => ({
    pepId,
    pepiniere: pepMap[pepId] || pepId,
    prevu: data.planned,
    livre: data.delivered,
  }));

  if (result.length === 0) return [];

  result.sort((a, b) => {
    const rateA = a.prevu > 0 ? a.livre / a.prevu : 0;
    const rateB = b.prevu > 0 ? b.livre / b.prevu : 0;
    return rateA - rateB;
  });

  return result;
}

/**
 * Main hook: compute stock projection from lots + offset.
 *
 * @param {Array} lots - All lots from appData
 * @param {Array} pepinieres - Pepinieres from appData
 * @param {number} offsetDays - Days offset (-15 to +45)
 * @returns {Object} { projectedDate, kpis, comparatif, projectedLots }
 */
export function useStockProjection(lots, pepinieres, offsetDays = 0) {
  return useMemo(() => {
    const today = new Date();
    const projectedDate = new Date(today);
    projectedDate.setDate(projectedDate.getDate() + offsetDays);

    // Build pepiniere name map
    const pepMap = {};
    (pepinieres || []).forEach((p) => {
      if (p && p._id) pepMap[p._id] = p.nom || p.code || 'Inconnu';
    });

    // Filter to production lots and compute projected stages
    const productionLots = (lots || []).filter(
      (l) => l && l.type === 'production'
    );

    const projectedLots = productionLots.map((lot) => ({
      ...lot,
      projectedStade: getProjectedStade(lot, projectedDate),
    }));

    // Compute KPIs from projected stages
    const encours = projectedLots.filter(
      (l) => !l.livre && l.projectedStade.color === 'gray'
    );
    const prets = projectedLots.filter(
      (l) => !l.livre && l.projectedStade.color === 'green'
    );
    const urgents = projectedLots.filter(
      (l) => !l.livre && l.projectedStade.color === 'orange'
    );
    const horsDelai = projectedLots.filter(
      (l) => !l.livre && l.projectedStade.color === 'red'
    );
    const livres = projectedLots.filter(
      (l) => l.statut === 'livre' || l.projectedStade.color === 'blue'
    );

    const kpis = {
      encours: {
        count: encours.length,
        plants: encours.reduce((s, l) => s + (l.quantite || 0), 0),
      },
      prets: {
        count: prets.length,
        plants: prets.reduce((s, l) => s + (l.quantite || 0), 0),
      },
      urgents: {
        count: urgents.length,
        plants: urgents.reduce((s, l) => s + (l.quantite || 0), 0),
      },
      horsDelai: {
        count: horsDelai.length,
        plants: horsDelai.reduce((s, l) => s + (l.quantite || 0), 0),
      },
      livres: {
        count: livres.length,
        plants: livres.reduce((s, l) => s + (l.quantite || 0), 0),
      },
    };

    // Compute alert status
    const alertInfo =
      horsDelai.length > 0
        ? {
            type: 'danger',
            message: `${horsDelai.length} lot(s) hors délai à la date projetée — risque de perte qualité. Livraison immédiate recommandée.`,
          }
        : urgents.length > 0
          ? {
              type: 'warning',
              message: `${urgents.length} lot(s) en zone urgente — organiser les livraisons sous 48h.`,
            }
          : null;

    // Compute comparatif data (livré vs planifié per pépinière)
    const comparatif = computeComparatif(productionLots, pepMap);

    return {
      projectedDate,
      offsetDays,
      kpis,
      alertInfo,
      comparatif,
      projectedLots,
    };
  }, [lots, pepinieres, offsetDays]);
}

export default useStockProjection;
