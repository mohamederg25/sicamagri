/**
 * Semis Service — Business Logic for Seedling/Stock Operations
 * =============================================================
 *
 * Extracts complex stock calculations and aggregation logic from
 * semisController. The controller focuses on req/res handling;
 * this service handles data computation.
 *
 * Stock formula:
 *   RECU       = SUM(semis.quantite) for (pepiniere, variete)
 *   UTILISE    = SUM(production lots.quantite) for (pepiniere, variete)
 *   DISPONIBLE = max(0, RECU - UTILISE)
 */

const Semis = require('../models/Semis');
const Lot = require('../models/Lot');
const Pepiniere = require('../models/Pepiniere');
const ProductionRule = require('../models/ProductionRule');
const { getPepiniereScope } = require('../utils/roleFilter');
const { AppError } = require('../utils/response');
const productionRuleService = require('./productionRuleService');

/**
 * Get the ingenieur-scoped query for semis and lots.
 * Returns { semisQuery, prodQuery, testQuery } with pepiniere filter if applicable.
 */
const buildScopedQueries = async (user, pepiniereFilter) => {
  let semisQuery = {};
  let prodQuery = { type: 'production' };

  if (pepiniereFilter && pepiniereFilter !== 'all') {
    semisQuery.pepiniere = pepiniereFilter;
  } else if (user && user.role === 'ingenieur') {
    const scope = await getPepiniereScope(user);
    if (scope.pepiniere) {
      semisQuery.pepiniere = scope.pepiniere;
    }
  }

  return { semisQuery, prodQuery };
};

/**
 * Compute aggregated stock data for all (pepiniere, variete) pairs.
 *
 * @param {Object} user - req.user (for role filtering)
 * @param {string} [pepiniereFilter] - Optional pepiniere ID to filter
 * @returns {Array} Stock entries with recu, utilise, disponible, tauxUtilisation
 */
const computeFullStock = async (user, pepiniereFilter) => {
  const { semisQuery, prodQuery } = await buildScopedQueries(user, pepiniereFilter);

  // Step 1: Get all semis entries (seeds received) — exclude externes from stock
  const semis = await Semis.find({ ...semisQuery, type: { $ne: 'externe' } })
    .populate('variete', 'nom')
    .populate('pepiniere', 'nom')
    .lean();

  // Step 2: Get all production lots (seeds consumed)
  const productionLots = await Lot.find(prodQuery)
    .populate({ path: 'semis', select: 'pepiniere variete' })
    .lean();

  // Step 3: Build group map (pepiniere_variete → { recu, utilise, records })
  const groupData = {};
  semis.forEach((s) => {
    if (!s.pepiniere) return;
    const key = `${s.pepiniere._id.toString()}-${s.variete._id.toString()}`;
    if (!groupData[key]) {
      groupData[key] = { recu: 0, utilise: 0, semisRecords: [] };
    }
    groupData[key].recu += s.quantite;
    groupData[key].semisRecords.push(s);
  });

  // Use stored quantiteUtilisee from Semis records instead of aggregating production lots
  Object.values(groupData).forEach((g) => {
    g.utilise = g.semisRecords.reduce((sum, s) => sum + (s.quantiteUtilisee || 0), 0);
  });

  // Step 4: Build response
  return Object.keys(groupData).map((key) => {
    const data = groupData[key];
    const recu = data.recu;
    const utilise = data.utilise;
    const disponible = Math.max(0, recu - utilise);
    const tauxUtilisation = recu > 0 ? Math.round((utilise / recu) * 100) : null;

    let statut = 'disponible';
    if (recu > 0 && utilise >= recu) statut = 'epuise';
    else if (utilise > 0) statut = 'en_usage';

    const rep = data.semisRecords[data.semisRecords.length - 1];

    return {
      _id: rep?._id || key,
      code: rep?.code || '-',
      variete: rep?.variete,
      pepiniere: rep?.pepiniere,
      recu,
      utilise,
      disponible,
      tauxUtilisation,
      statut,
      tauxGermination: rep?.tauxGermination ?? null,
      lotSemenceParentId: null,
    };
  });
};

/**
 * Compute stock summary for a single semis document.
 * Aggregates across all semis with same (pepiniere, variete) pair.
 */
const computeSingleStockSummary = async (semis) => {
  const allSemis = await Semis.find({
    pepiniere: semis.pepiniere._id,
    variete: semis.variete._id,
  });

  const recu = allSemis.reduce((sum, s) => sum + s.quantite, 0);
  const utilise = allSemis.reduce((sum, s) => sum + (s.quantiteUtilisee || 0), 0);
  const disponible = Math.max(0, recu - utilise);
  const tauxUtilisation = recu > 0 ? Math.round((utilise / recu) * 100) : null;

  let statut = 'disponible';
  if (recu > 0 && utilise >= recu) statut = 'epuise';
  else if (utilise > 0) statut = 'en_usage';

  return { recu, utilise, disponible, tauxUtilisation, statut };
};

/**
 * Resolve and store the matching ProductionRule on a Semis document.
 * This binds the rule at Semis creation time for historical consistency.
 * Called automatically after creating a new Semis.
 *
 * @param {Object} semis - The newly created Semis document (with _id, createdAt, variete)
 * @param {string|Date} [sowingDate] - Optional explicit sowing date (from frontend form)
 * @returns {Promise<Object|null>} - The attached rule, or null if no match
 */
const resolveAndAttachRuleToSemis = async (semis, sowingDate) => {
  if (!sowingDate) {
    sowingDate = semis.createdAt || new Date();
  }
  const varieteId = semis.variete?._id || semis.variete;

  const ruleResolution = await productionRuleService.resolveRuleAndDates(sowingDate, varieteId);
  if (!ruleResolution) return null;

  // Store the rule reference on the Semis document
  await Semis.findByIdAndUpdate(semis._id, {
    productionRuleRef: ruleResolution.rule._id,
  });

  return ruleResolution.rule;
};

/**
 * Compute production estimates (timeline + plant count).
 *
 * Uses the ProductionRule linked to the Semis (preferred) or resolves dynamically.
 * Falls back gracefully if no matching rule is found.
 */
const computeProductionEstimate = async (semis) => {
  const tauxGermination = semis.tauxGermination ?? null;
  const nombrePlantsEstimes = tauxGermination != null && semis.quantite != null
    ? Math.round((semis.quantite * tauxGermination) / 100)
    : null;

  // ── Resolve ProductionRule dynamically ─────────
  const sowingDate = semis.createdAt || new Date();
  const varieteId = semis.variete?._id || semis.variete;

  let ruleResolution = null;

  // Try using the already-stored productionRuleRef first
  if (semis.productionRuleRef) {
    const rule = semis.productionRuleRef;
    if (typeof rule === 'object' && rule.productionMinDays != null) {
      const dates = productionRuleService.calculateDatesFromRule
        ? productionRuleService.calculateDatesFromRule(rule, sowingDate)
        : null;
      if (dates) {
        ruleResolution = { rule, dates };
      }
    }
  }

  // Fallback: Resolve dynamically (first-time or fallback)
  if (!ruleResolution) {
    ruleResolution = await productionRuleService.resolveRuleAndDates(sowingDate, varieteId);
  }

  let dureeProduction = { min: 30, max: 60 };   // Safe fallback
  let fenetreMaturite = { min: 30, max: 60 };    // Safe fallback (matching dureeProduction fallback)
  let ruleDates = null;

  if (ruleResolution) {
    const rule = ruleResolution.rule;
    const dates = ruleResolution.dates;
    dureeProduction = { min: rule.productionMinDays, max: rule.productionMaxDays };
    fenetreMaturite = { min: rule.productionMinDays, max: rule.productionMaxDays };
    ruleDates = {
      debut: new Date(sowingDate).toISOString(),
      finMin: dates.expectedReadyDateMin.toISOString(),
      finMax: dates.expectedReadyDateMax.toISOString(),
      maturiteMin: dates.expectedReadyDateMin.toISOString(),
      maturiteMax: dates.expectedReadyDateMax.toISOString(),
    };
  } else {
    // Legacy fallback (no rule configured)
    const debut = new Date(sowingDate);
    const finMin = new Date(debut);
    finMin.setDate(finMin.getDate() + dureeProduction.min);
    const finMax = new Date(debut);
    finMax.setDate(finMax.getDate() + dureeProduction.max);
    const maturiteMin = new Date(debut);
    maturiteMin.setDate(maturiteMin.getDate() + fenetreMaturite.min);
    const maturiteMax = new Date(debut);
    maturiteMax.setDate(maturiteMax.getDate() + fenetreMaturite.max);
    ruleDates = {
      debut: debut.toISOString(),
      finMin: finMin.toISOString(),
      finMax: finMax.toISOString(),
      maturiteMin: maturiteMin.toISOString(),
      maturiteMax: maturiteMax.toISOString(),
    };
  }

  return {
    tauxGermination,
    nombrePlantsEstimes,
    dureeProduction,
    fenetreMaturite,
    dates: ruleDates,
    productionRuleSource: ruleResolution?.rule?.code || 'fallback',
  };
};



/**
 * Check if an ingenieur has access to a specific semis entry.
 * Throws AppError(403) if not authorized.
 */
const checkIngenieurAccess = async (user, semisPepiniereId) => {
  if (user && user.role === 'ingenieur') {
    const pepCount = await Pepiniere.countDocuments({
      _id: semisPepiniereId,
      ingenieur: user._id,
    });
    if (pepCount === 0) {
      throw new AppError('Non autorisé', 403);
    }
  }
};

/**
 * Compute anomalies / supervision data for all semis.
 * Returns each semis enriched with production stats and anomaly flags.
 */
const computeSemisAnomalies = async (user) => {
  let semisQuery = {};
  if (user && user.role === 'ingenieur') {
    const scope = await getPepiniereScope(user);
    if (scope.pepiniere) {
      semisQuery.pepiniere = scope.pepiniere;
    }
  }

  // 1. Get all semis
  const semisList = await Semis.find(semisQuery)
    .populate('variete', 'nom')
    .populate('pepiniere', 'nom')
    .populate('createdBy', 'nom')
    .lean();

  // 2. Get all production lots grouped by semis
  const prodLots = await Lot.find({ type: 'production' })
    .select('semis nombrePlantsProduits quantiteLivree quantite statut dateRecolte dateLivraison code expectedReadyDateMax createdAt')
    .lean();

  const lotsBySemis = {};
  prodLots.forEach((lot) => {
    const semisId = lot.semis ? lot.semis.toString() : null;
    if (!semisId) return;
    if (!lotsBySemis[semisId]) lotsBySemis[semisId] = [];
    lotsBySemis[semisId].push(lot);
  });

  const germBySemis = {};
  // Populate germBySemis from Semis documents
  semisList.forEach((semis) => {
    const id = semis._id.toString();
    germBySemis[id] = semis.tauxGermination ?? null;
  });

  // 4. Compute date boundaries for trend comparison
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  // Aggregate trends across ALL semis
  let currentMonthSemis = 0;
  let prevMonthSemis = 0;
  let currentMonthLots = 0;
  let prevMonthLots = 0;
  let currentMonthPlants = 0;
  let prevMonthPlants = 0;
  let currentMonthLivree = 0;
  let prevMonthLivree = 0;
  let currentMonthAnomalies = 0;
  let prevMonthAnomalies = 0;

  // 5. Build result with anomaly detection
  const results = semisList.map((semis) => {
    const id = semis._id.toString();
    const lots = lotsBySemis[id] || [];
    const tauxGermination = semis.tauxGermination ?? germBySemis[id];
    const totalPlanted = lots.reduce((sum, l) => sum + (l.quantite || 0), 0);
    const totalPlantsProduced = lots.reduce((sum, l) => sum + (l.nombrePlantsProduits || 0), 0);
    const totalDelivered = lots.reduce((sum, l) => sum + (l.quantiteLivree || 0), 0);
    const activeLots = lots.filter((l) => l.statut === 'en_cours' || l.statut === 'pret' || l.statut === 'recolte');

    // Expected plants = quantite * germinationRate / 100
    const expectedPlants = tauxGermination != null && semis.quantite != null
      ? Math.round((semis.quantite * tauxGermination) / 100)
      : null;

    // Utilization rate
    const tauxUtilisation = semis.quantite > 0
      ? Math.round(((semis.quantiteUtilisee || 0) / semis.quantite) * 100)
      : null;

    // Anomaly detection
    const anomalies = [];

    // — Quantity-based anomalies —
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (semis.quantiteUtilisee === 0 && new Date(semis.createdAt) < sevenDaysAgo) {
      anomalies.push({ type: 'NO_USAGE', severity: 'warning', message: 'Semis jamais utilisé après 7 jours' });
    } else if (tauxUtilisation != null && tauxUtilisation < 30 && lots.length > 0) {
      anomalies.push({ type: 'LOW_UTILIZATION', severity: 'warning', message: `Faible utilisation (${tauxUtilisation}%) — seulement ${lots.length} lot(s) créé(s)` });
    }

    if (tauxUtilisation != null && tauxUtilisation > 90) {
      anomalies.push({ type: 'HIGH_UTILIZATION', severity: 'info', message: `Stock quasi épuisé (${tauxUtilisation}% utilisé)` });
    }

    // — Production-based anomalies —
    if (lots.length === 0 && semis.statut !== 'annulee') {
      anomalies.push({ type: 'NO_PRODUCTION', severity: 'critical', message: 'Aucun lot de production créé' });
    }

    // — Production vs expected (germination rate) —
    if (expectedPlants != null && totalPlantsProduced > 0) {
      const variance = Math.round(((totalPlantsProduced - expectedPlants) / expectedPlants) * 100);
      if (variance < -30) {
        anomalies.push({ type: 'UNDER_PRODUCTION', severity: 'critical', message: `Production inférieure de ${Math.abs(variance)}% aux prévisions (${totalPlantsProduced} au lieu de ${expectedPlants} attendus via germination ${tauxGermination}%)` });
      } else if (variance > 30) {
        anomalies.push({ type: 'OVER_PRODUCTION', severity: 'warning', message: `Production supérieure de ${variance}% aux prévisions (${totalPlantsProduced} au lieu de ${expectedPlants} attendus via germination ${tauxGermination}%)` });
      }
    }

    // — Yield anomaly: plants produced vs seeds planted (per lot) —
    if (lots.length > 0 && totalPlanted > 0 && totalPlantsProduced > 0) {
      const yieldRatio = Math.round((totalPlantsProduced / totalPlanted) * 100);
      const expectedYield = tauxGermination != null ? tauxGermination : 70; // fallback 70%
      const yieldVariance = yieldRatio - expectedYield;

      if (yieldVariance < -20) {
        anomalies.push({ type: 'LOW_YIELD', severity: 'critical', message: `Rendement faible: ${yieldRatio}% (${totalPlantsProduced} plants pour ${totalPlanted} graines) vs ${expectedYield}% attendu` });
      } else if (yieldVariance > 20) {
        anomalies.push({ type: 'HIGH_YIELD', severity: 'warning', message: `Rendement élevé: ${yieldRatio}% (${totalPlantsProduced} plants pour ${totalPlanted} graines) vs ${expectedYield}% attendu` });
      }
    }

    // — Delivery gap: produced vs delivered —
    if (totalPlantsProduced > 0) {
      const deliveryRate = Math.round((totalDelivered / totalPlantsProduced) * 100);
      if (totalDelivered === 0 && lots.some((l) => l.statut === 'livre' || l.statut === 'recolte')) {
        anomalies.push({ type: 'NO_DELIVERY', severity: 'critical', message: `Aucune livraison enregistrée malgré ${totalPlantsProduced} plants produits` });
      } else if (deliveryRate < 70 && lots.some((l) => l.statut === 'livre' || l.statut === 'recolte')) {
        anomalies.push({ type: 'LOW_DELIVERY', severity: 'warning', message: `Écart livraison: seulement ${deliveryRate}% livré (${totalDelivered}/${totalPlantsProduced} plants)` });
      } else if (totalDelivered > 0 && deliveryRate < 80) {
        anomalies.push({ type: 'PARTIAL_DELIVERY', severity: 'warning', message: `Livraison partielle: ${deliveryRate}% livré (${totalDelivered}/${totalPlantsProduced} plants)` });
      }
    }

    // — Date-based anomalies —
    if (activeLots.length > 0 && semis.statut !== 'realisee') {
      const overdueLots = activeLots.filter(
        (l) => l.expectedReadyDateMax && new Date(l.expectedReadyDateMax) < now
      );
      if (overdueLots.length > 0) {
        anomalies.push({ type: 'OVERDUE', severity: 'critical', message: `${overdueLots.length} lot(s) en production au-delà de la date prévue` });
      }
    }

    // — Germination anomalies —
    if (tauxGermination == null && lots.length > 0) {
      anomalies.push({ type: 'NO_GERMINATION', severity: 'warning', message: 'Aucun taux de germination défini' });
    } else if (tauxGermination != null && tauxGermination < 40) {
      anomalies.push({ type: 'LOW_GERMINATION', severity: 'critical', message: `Taux de germination très bas (${tauxGermination}%)` });
    }

    // — Per-semis trend: previous month vs current month —
    const semisCurrentLots = lots.filter((l) => new Date(l.createdAt || semis.createdAt) >= monthStart);
    const semisPrevLots = lots.filter(
      (l) => new Date(l.createdAt || semis.createdAt) >= prevMonthStart && new Date(l.createdAt || semis.createdAt) < monthStart
    );
    const semisCurrentProd = semisCurrentLots.reduce((s, l) => s + (l.nombrePlantsProduits || 0), 0);
    const semisPrevProd = semisPrevLots.reduce((s, l) => s + (l.nombrePlantsProduits || 0), 0);

    let productionTrend = null;
    let productionTrendPct = null;
    if (semisPrevProd > 0 && semisCurrentProd > 0) {
      productionTrendPct = Math.round(((semisCurrentProd - semisPrevProd) / semisPrevProd) * 100);
      productionTrend = productionTrendPct > 10 ? 'up' : productionTrendPct < -10 ? 'down' : 'stable';
    } else if (semisPrevProd === 0 && semisCurrentProd > 0) {
      productionTrend = 'up';
      productionTrendPct = 100;
    } else if (semisPrevProd > 0 && semisCurrentProd === 0) {
      productionTrend = 'down';
      productionTrendPct = -100;
    }

    // Update aggregate counters
    currentMonthSemis += new Date(semis.createdAt) >= monthStart ? 1 : 0;
    prevMonthSemis += new Date(semis.createdAt) >= prevMonthStart && new Date(semis.createdAt) < monthStart ? 1 : 0;
    currentMonthLots += semisCurrentLots.length;
    prevMonthLots += semisPrevLots.length;
    currentMonthPlants += semisCurrentProd;
    prevMonthPlants += semisPrevProd;

    const currentMonthDelivered = semisCurrentLots.reduce((s, l) => s + (l.quantiteLivree || 0), 0);
    const prevMonthDelivered = semisPrevLots.reduce((s, l) => s + (l.quantiteLivree || 0), 0);
    currentMonthLivree += currentMonthDelivered;
    prevMonthLivree += prevMonthDelivered;
    // Per-semis anomaly counters for monthly comparison
    const semisCreatedThisMonth = new Date(semis.createdAt) >= monthStart;
    const semisCreatedPrevMonth = new Date(semis.createdAt) >= prevMonthStart && new Date(semis.createdAt) < monthStart;
    if (semisCreatedThisMonth) {
      currentMonthAnomalies += anomalies.length;
    }
    if (semisCreatedPrevMonth) {
      prevMonthAnomalies += anomalies.length;
    }

    // Severity score for sorting
    const severityScore = anomalies.reduce((score, a) => {
      if (a.severity === 'critical') return score + 3;
      if (a.severity === 'warning') return score + 1;
      return score;
    }, 0);

    return {
      _id: semis._id,
      code: semis.code,
      variete: semis.variete,
      pepiniere: semis.pepiniere,
      quantite: semis.quantite,
      quantiteUtilisee: semis.quantiteUtilisee || 0,
      disponible: Math.max(0, semis.quantite - (semis.quantiteUtilisee || 0)),
      statut: semis.statut,
      tauxUtilisation,
      tauxGermination,
      expectedPlants,
      totalPlanted,
      totalPlantsProduced,
      totalDelivered,
      lotsCount: lots.length,
      activeLotsCount: activeLots.length,
      completedLotsCount: lots.filter((l) => l.statut === 'livre').length,
      createdAt: semis.createdAt,
      createdBy: semis.createdBy,
      anomalies,
      severityScore,
      hasAnomalies: anomalies.length > 0,
      // Per-semis trend
      productionTrend,
      productionTrendPct,
    };
  });

  // Sort by severity score descending (most critical first)
  results.sort((a, b) => b.severityScore - a.severityScore);

  // ── Compute aggregate trends ──
  const computeTrend = (current, previous) => {
    if (previous === 0 && current === 0) return { direction: 'stable', pct: 0 };
    if (previous === 0) return { direction: 'up', pct: 100 };
    const pct = Math.round(((current - previous) / previous) * 100);
    const direction = pct > 10 ? 'up' : pct < -10 ? 'down' : 'stable';
    return { direction, pct };
  };

  const trends = {
    semis: computeTrend(currentMonthSemis, prevMonthSemis),
    lots: computeTrend(currentMonthLots, prevMonthLots),
    plantsProduits: computeTrend(currentMonthPlants, prevMonthPlants),
    plantesLivrees: computeTrend(currentMonthLivree, prevMonthLivree),
    anomalies: computeTrend(currentMonthAnomalies, prevMonthAnomalies),
  };

  return { results, trends };
};

/**
 * Compute statistics for external sorties (type: 'externe')
 * No pepiniere filter — external semis aren't bound to any nursery.
 */
const computeExternalStats = async (user) => {
  const query = { type: 'externe' };

  const semis = await Semis.find(query)
    .populate('variete', 'nom')
    .populate('createdBy', 'nom')
    .sort({ createdAt: -1 })
    .lean();

  // ── Aggregate stats ──
  const totalSorties = semis.length;
  const totalQuantite = semis.reduce((sum, s) => sum + (s.quantite || 0), 0);

  // Motif breakdown
  const motifCounts = {};
  semis.forEach((s) => {
    const motif = (s.motif || 'Non spécifié').trim();
    if (!motifCounts[motif]) motifCounts[motif] = { count: 0, quantite: 0, motif };
    motifCounts[motif].count++;
    motifCounts[motif].quantite += s.quantite || 0;
  });
  const motifBreakdown = Object.values(motifCounts).sort((a, b) => b.count - a.count);

  // Monthly stats (last 12 months)
  const now = new Date();
  const monthlyStats = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const monthSemis = semis.filter((s) => {
      const d = new Date(s.createdAt);
      return d >= monthStart && d < monthEnd;
    });
    const monthQuantite = monthSemis.reduce((sum, s) => sum + (s.quantite || 0), 0);
    monthlyStats.push({
      month: monthStart.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
      count: monthSemis.length,
      quantite: monthQuantite,
    });
  }

  // Top varietes
  const varieteCounts = {};
  semis.forEach((s) => {
    const varieteId = s.variete?._id?.toString() || 'inconnu';
    const varieteName = s.variete?.nom || 'Inconnue';
    if (!varieteCounts[varieteId]) varieteCounts[varieteId] = { variete: varieteName, count: 0, quantite: 0 };
    varieteCounts[varieteId].count++;
    varieteCounts[varieteId].quantite += s.quantite || 0;
  });
  const topVarietes = Object.values(varieteCounts).sort((a, b) => b.quantite - a.quantite);

  // Recent sorties (last 20)
  const recentSorties = semis.slice(0, 20);

  return {
    totalSorties,
    totalQuantite,
    motifBreakdown,
    monthlyStats,
    topVarietes,
    recentSorties,
  };
};

module.exports = {
  computeFullStock,
  computeSingleStockSummary,
  computeProductionEstimate,
  checkIngenieurAccess,
  buildScopedQueries,
  resolveAndAttachRuleToSemis,
  computeSemisAnomalies,
  computeExternalStats,
};
