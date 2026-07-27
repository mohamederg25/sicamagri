/**
 * Stock Service — Business Logic for Seed Warehouse Stock
 * =========================================================
 *
 * Handles:
 *   - CRUD for StockSemence (warehouse entries)
 *   - Movement tracking (sortie_pepiniere, bon_passage)
 *   - Stock balance validation (prevent over-consumption)
 *   - Statistics computation (utilisation, yield per variety)
 */

const StockSemence = require('../models/StockSemence');
const StockMouvement = require('../models/StockMouvement');
const StockGerminationTest = require('../models/StockGerminationTest');
const Fournisseur = require('../models/Fournisseur');
const Semis = require('../models/Semis');
const Lot = require('../models/Lot');
const mongoose = require('mongoose');
const { generateCode } = require('../utils/codeGenerator');
const { AppError } = require('../utils/response');

/**
 * Allowed fields for creating stock entries.
 */
const ALLOWED_CREATE_FIELDS = [
  'variete', 'quantiteInitiale', 'fournisseur', 'dateReception', 'observations', 'tauxManuel'
];

/**
 * Sanitize stock input.
 */
const sanitizeInput = (body, fields) => {
  const sanitized = {};
  for (const field of fields) {
    if (body[field] !== undefined) {
      sanitized[field] = body[field];
    }
  }
  return sanitized;
};

/**
 * Generate a 2-letter abbreviation from a fournisseur name.
 * Takes first letter of first two significant words, or first 2 chars of single word.
 * Examples:
 *   "Société Agricole du Sud" → "SA"
 *   "Semco" → "SE"
 *   "Graines de France" → "GF"
 *   "Pépinières du Littoral" → "PL"
 */
const getFournisseurAbbr = (nom) => {
  if (!nom) return 'XX';
  const words = nom.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1) {
    // Single word: take first 2 chars, uppercase
    return words[0].substring(0, 2).toUpperCase();
  }
  // Multiple words: take first letter of first two significant words
  const skipWords = ['de', 'du', 'des', 'le', 'la', 'les', 'l\'', 'd\'', 'et'];
  const significant = words.filter(w => !skipWords.includes(w.toLowerCase()) && w.length > 1);
  if (significant.length === 0) {
    // Fallback: first 2 chars of first word
    return words[0].substring(0, 2).toUpperCase();
  }
  const initials = significant.slice(0, 2).map(w => w[0].toUpperCase()).join('');
  if (initials.length < 2) {
    // Pad with second char of first significant word
    return (initials + significant[0][1]?.toUpperCase() || 'X').substring(0, 2);
  }
  return initials.substring(0, 2);
};

/**
 * Format a date to YYMMDD using local time (e.g., 2025-07-14 → 250714).
 */
const formatYYMMDD = (date) => {
  const y = date.getFullYear() % 100;
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${String(y).padStart(2, '0')}${m}${d}`;
};

/**
 * Cache for fournisseur lookups (avoids duplicate DB queries in batch mode).
 * Shared across calls within the same batch. Cleared after batch completes.
 * Uses TTL-based expiry to prevent memory leaks.
 */
const fournisseurCache = new Map();
const CACHE_TTL = 60000; // 60 seconds

/**
 * Clear expired entries from the fournisseur cache.
 */
const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, entry] of fournisseurCache) {
    if (now - entry.timestamp > CACHE_TTL) {
      fournisseurCache.delete(key);
    }
  }
};

/**
 * Get or fetch a fournisseur with TTL-based caching.
 */
const getCachedFournisseur = async (fournisseurId) => {
  const fId = fournisseurId.toString();
  const cached = fournisseurCache.get(fId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const fournisseur = await Fournisseur.findById(fournisseurId).lean();
  fournisseurCache.set(fId, { data: fournisseur, timestamp: Date.now() });
  return fournisseur;
};

/**
 * Generate a stock code with date and supplier abbreviation.
 * Format: YYMMDDAB (e.g., 250714SE for Semco, 250714SA for Société Agricole)
 * If no fournisseur: YYMMDDXX
 * Ensures uniqueness by appending a counter if code already exists.
 */
const generateStockCode = async (dateReception, fournisseurId) => {
  let date = dateReception ? new Date(dateReception) : new Date();
  if (isNaN(date.getTime())) date = new Date(); // fallback si date invalide
  const yymmdd = formatYYMMDD(date);

  let abbr = 'XX';
  if (fournisseurId) {
    clearExpiredCache();
    const fournisseur = await getCachedFournisseur(fournisseurId);
    if (fournisseur) {
      abbr = getFournisseurAbbr(fournisseur.nom);
    }
  }

  const baseCode = `${yymmdd}${abbr}`;

  // Check if this code already exists, append counter if needed
  const existing = await StockSemence.findOne({ code: { $regex: `^${baseCode}` } })
    .sort({ code: -1 })
    .lean();

  if (!existing) {
    return baseCode;
  }

  // Get the highest counter suffix
  const match = existing.code.match(/(\d+)$/);
  const nextNum = match ? parseInt(match[1], 10) + 1 : 1;
  return `${baseCode}${String(nextNum).padStart(2, '0')}`;
};

/**
 * Get all stock entries, with optional filters.
 */
const getAll = async (user, filters = {}) => {
  const query = {};

  if (filters.statut && filters.statut !== 'all') {
    query.statut = filters.statut;
  }
  if (filters.variete && filters.variete !== 'all') {
    query.variete = filters.variete;
  }

  const stock = await StockSemence.find(query)
    .populate('variete', 'nom code')
    .populate('fournisseur', 'nom code')
    .populate('createdBy', 'nom')
    .populate('mouvements')
    .populate('germinationTests')
    .sort({ dateReception: -1 })
    .lean();

  // Compute best germination rate for each stock entry
  stock.forEach((entry) => {
    entry.tauxGermination = computeTauxGermination(entry);
  });

  return stock;
};

/**
 * Get a single stock entry by ID with full details.
 */
const getById = async (id) => {
  const stock = await StockSemence.findById(id)
    .populate('variete', 'nom code statut')
    .populate('fournisseur', 'nom code')
    .populate('createdBy', 'nom')
    .populate('germinationTests')
    .lean();

  if (!stock) throw new AppError('Stock non trouvé', 404);

  // Get movements with populated references
  const mouvements = await StockMouvement.find({ stockSemence: id })
    .populate('pepiniere', 'nom')
    .populate('semisCree', 'code')
    .populate('createdBy', 'nom')
    .sort({ dateMouvement: -1 })
    .lean();

  // Sort germination tests newest first
  if (stock.germinationTests) {
    stock.germinationTests.sort((a, b) => new Date(b.dateTest) - new Date(a.dateTest));
  }

  // Compute best available germination rate
  const tauxGermination = computeTauxGermination(stock);

  return { ...stock, mouvements, tauxGermination };
};

/**
 * Create a new stock entry.
 */
const create = async (data, userId) => {
  const sanitized = sanitizeInput(data, ALLOWED_CREATE_FIELDS);

  if (!sanitized.quantiteInitiale || sanitized.quantiteInitiale <= 0) {
    throw new AppError('La quantité initiale doit être supérieure à 0', 400);
  }

  // Generate code with date and fournisseur abbreviation
  const code = await generateStockCode(sanitized.dateReception, sanitized.fournisseur);

  const stock = await StockSemence.create({
    ...sanitized,
    quantiteInitiale: Number(sanitized.quantiteInitiale),
    quantiteRestante: Number(sanitized.quantiteInitiale),
    code,
    createdBy: userId,
  });

  // ── Create audit trail movement ──
  await StockMouvement.create({
    stockSemence: stock._id,
    type: 'entree_stock',
    quantite: Number(sanitized.quantiteInitiale),
    dateMouvement: sanitized.dateReception || new Date(),
    motif: `Entrée en stock : ${Number(sanitized.quantiteInitiale)} graines`,
    createdBy: userId,
  });

  return StockSemence.findById(stock._id)
    .populate('variete', 'nom code')
    .populate('fournisseur', 'nom code')
    .populate('createdBy', 'nom')
    .lean();
};

/**
 * Create multiple stock entries at once (batch).
 * Each entry must have at least variete and quantiteInitiale.
 */
const createBatch = async (entries, userId) => {
  if (!entries || entries.length === 0) {
    throw new AppError('Aucune entrée à créer', 400);
  }

  const created = [];
  for (const entry of entries) {
    const sanitized = sanitizeInput(entry, ALLOWED_CREATE_FIELDS);
    if (!sanitized.quantiteInitiale || sanitized.quantiteInitiale <= 0) {
      throw new AppError(`Quantité invalide pour ${sanitized.variete || 'une entrée'}`, 400);
    }
    if (!sanitized.variete) {
      throw new AppError('Chaque entrée doit avoir une variété', 400);
    }

    // Generate code with date and fournisseur abbreviation
    const code = await generateStockCode(sanitized.dateReception, sanitized.fournisseur);

    const stock = await StockSemence.create({
      ...sanitized,
      quantiteInitiale: Number(sanitized.quantiteInitiale),
      quantiteRestante: Number(sanitized.quantiteInitiale),
      code,
      createdBy: userId,
    });

    // Create audit trail movement
    await StockMouvement.create({
      stockSemence: stock._id,
      type: 'entree_stock',
      quantite: Number(sanitized.quantiteInitiale),
      dateMouvement: sanitized.dateReception || new Date(),
      motif: `Entrée en stock (batch) : ${Number(sanitized.quantiteInitiale)} graines`,
      createdBy: userId,
    });

    created.push(stock._id);
  }

  // Return populated entries
  return StockSemence.find({ _id: { $in: created } })
    .populate('variete', 'nom code')
    .populate('fournisseur', 'nom code')
    .populate('createdBy', 'nom')
    .lean();
};

/**
 * Delete a stock entry (only if no movements).
 */
const remove = async (id) => {
  const stock = await StockSemence.findById(id);
  if (!stock) throw new AppError('Stock non trouvé', 404);

  const mouvementCount = await StockMouvement.countDocuments({ stockSemence: id });
  if (mouvementCount > 0) {
    throw new AppError(
      'Impossible de supprimer ce stock : des mouvements existent. Supprimez d\'abord les mouvements.',
      400
    );
  }

  await StockSemence.findByIdAndDelete(id);
  return stock;
};

/**
 * Generate a "Référence du bon" for bon_passage movements.
 * Format: BP-YYYYMM-XXXX (e.g., BP-202607-0001)
 * Sequential counter per month.
 */
const generateReferenceBon = async () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `BP-${y}${m}-`;

  // Find the last bon_passage with a reference starting with the current month prefix
  const last = await StockMouvement.findOne({
    type: 'bon_passage',
    referenceBon: { $regex: `^${prefix}` },
  })
    .sort({ referenceBon: -1 })
    .lean();

  let nextNum = 1;
  if (last && last.referenceBon) {
    const match = last.referenceBon.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[0], 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

/**
 * Process a stock movement (sortie_pepiniere or bon_passage).
 *
 * For sortie_pepiniere:
 *   - Creates a Semis record for the targeted nursery
 *   - Links the Semis back to this movement
 *
 * For bon_passage:
 *   - Simple exit document, no Semis created
 *   - Référence du bon is auto-generated if not provided
 *
 * Both types decrement the stock quantity.
 */
const createMovement = async (data, userId) => {
  const { stockSemence: stockId, type, quantite, pepiniere, referenceBon, motif } = data;

  if (!quantite || quantite <= 0) {
    throw new AppError('La quantité doit être supérieure à 0', 400);
  }

  // Find and validate stock
  const stock = await StockSemence.findById(stockId);
  if (!stock) throw new AppError('Stock non trouvé', 404);

  if (quantite > stock.quantiteRestante) {
    throw new AppError(
      `Stock insuffisant : la quantité demandée (${quantite}) dépasse le disponible (${stock.quantiteRestante})`,
      400
    );
  }

  // ── Future stock validation ──
  // Stock cannot be used before its reception date
  if (stock.dateReception) {
    const receptionDate = new Date(stock.dateReception);
    receptionDate.setHours(0, 0, 0, 0);

    // Validate that the movement date is not before the reception date
    const mouvementDate = data.dateMouvement ? new Date(data.dateMouvement) : new Date();
    mouvementDate.setHours(0, 0, 0, 0);
    if (mouvementDate < receptionDate) {
      throw new AppError(
        `La date du mouvement (${mouvementDate.toLocaleDateString('fr-FR')}) ne peut pas être antérieure à la date de réception du stock (${receptionDate.toLocaleDateString('fr-FR')}).`,
        400
      );
    }

    // Also validate that the stock has already been received (reception date not in the future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (receptionDate > today) {
      throw new AppError(
        `Ce stock ne pourra être utilisé qu'à partir du ${receptionDate.toLocaleDateString('fr-FR')} (date de réception).`,
        400
      );
    }
  }

  // ── Germination rate validation (applies to ALL movement types) ──
  const hasGermination = stock.tauxManuel != null || (await StockGerminationTest.countDocuments({ stockSemence: stockId })) > 0;
  if (!hasGermination) {
    throw new AppError(
      'Un taux de germination doit être défini sur ce stock avant de pouvoir effectuer une sortie. Veuillez d\'abord ajouter un test de germination (via le menu du stock) ou un taux manuel.',
      400
    );
  }

  let semisCree = null;
  let finalReferenceBon = referenceBon || '';

  // For sortie_pepiniere: create a Semis record with the stock's germination rate
  if (type === 'sortie_pepiniere') {
    if (!pepiniere) {
      throw new AppError('La pépinière de destination est requise pour une sortie en pépinière', 400);
    }

    // ── Compute best germination rate from stock ──
    const stockWithGerm = await StockSemence.findById(stockId)
      .populate('germinationTests')
      .lean();
    // Sort tests newest-first (populate doesn't guarantee order)
    if (stockWithGerm?.germinationTests) {
      stockWithGerm.germinationTests.sort((a, b) => new Date(b.dateTest) - new Date(a.dateTest));
    }
    const tauxGermination = computeTauxGermination(stockWithGerm);

    const semisCode = await generateCode(Semis, 'S');
    const semis = await Semis.create({
      code: semisCode,
      variete: stock.variete,
      pepiniere,
      quantite,
      statut: 'prevue',
      tauxGermination,  // Inherit germination rate from the stock
      createdBy: userId,
    });
    semisCree = semis._id;
  }

  // For bon_passage: auto-generate reference if not provided
  if (type === 'bon_passage') {
    if (!finalReferenceBon && !motif) {
      throw new AppError('Veuillez fournir une référence de bon ou un motif pour le bon de passage', 400);
    }
    if (!finalReferenceBon) {
      // Auto-generate a reference
      finalReferenceBon = await generateReferenceBon();
    }
  }

  // Create the movement
  const mouvement = await StockMouvement.create({
    stockSemence: stockId,
    type,
    quantite: Number(quantite),
    dateMouvement: data.dateMouvement || new Date(),
    pepiniere: type === 'sortie_pepiniere' ? pepiniere : null,
    semisCree,
    referenceBon: finalReferenceBon,
    motif: motif || '',
    createdBy: userId,
  });

  // Decrement stock quantity
  stock.quantiteRestante -= Number(quantite);
  await stock.save();

  // ── Real-time notification if stock became ended ──
  if (stock.statut === 'epuise') {
    try {
      const { getIO } = require('./socketService');
      const io = getIO();
      if (io) {
        io.emit('stock:ended', {
          stockId: stock._id,
          code: stock.code,
          variete: stock.variete,
          quantiteInitiale: stock.quantiteInitiale,
          quantiteUtilisee: stock.quantiteInitiale,
          timestamp: new Date().toISOString(),
        });
        console.log(`[Socket.IO] Emitted stock:ended for ${stock.code}`);
      }
    } catch (e) {
      // Socket notification is non-critical
    }
  }

  // Populate and return
  const populated = await StockMouvement.findById(mouvement._id)
    .populate('pepiniere', 'nom')
    .populate('semisCree', 'code')
    .populate('createdBy', 'nom')
    .lean();

  return populated;
};

/**
 * Get all movements across all stock entries (global history).
 */
const getAllMovements = async (user, filters = {}) => {
  const query = {};

  if (filters.type && filters.type !== 'all') {
    query.type = filters.type;
  }

  const mouvements = await StockMouvement.find(query)
    .populate('stockSemence', 'code')
    .populate('semisCree', 'code')
    .populate('pepiniere', 'nom')
    .populate('createdBy', 'nom')
    .sort({ dateMouvement: -1 })
    .lean();

  return mouvements;
};

/**
 * Compute stock statistics for the dashboard.
 *
 * Returns:
 *   - Total stock entries
 *   - Total initial quantity
 *   - Total remaining quantity
 *   - Total utilized quantity
 *   - Overall utilization rate
 *   - Stock by status breakdown
 *   - Movements by type breakdown
 *   - Yield analysis per variety (comparing stock -> semis -> production)
 */
const getStats = async () => {
  const stock = await StockSemence.find({})
    .populate('variete', 'nom code')
    .lean();

  const mouvements = await StockMouvement.find({})
    .populate('semisCree', 'code')
    .lean();

  // ── Overall stats ──
  const totalEntries = stock.length;
  const totalInitial = stock.reduce((sum, s) => sum + (s.quantiteInitiale || 0), 0);
  const totalRestant = stock.reduce((sum, s) => sum + (s.quantiteRestante || 0), 0);
  const totalUtilise = totalInitial - totalRestant;
  const tauxUtilisationGlobal = totalInitial > 0 ? Math.round((totalUtilise / totalInitial) * 100) : 0;

  // ── Status breakdown ──
  const statusBreakdown = {
    disponible: stock.filter((s) => s.statut === 'disponible').length,
    en_usage: stock.filter((s) => s.statut === 'en_usage').length,
    epuise: stock.filter((s) => s.statut === 'epuise').length,
  };

  const disponibleQte = stock
    .filter((s) => s.statut === 'disponible')
    .reduce((sum, s) => sum + (s.quantiteRestante || 0), 0);
  const enUsageQte = stock
    .filter((s) => s.statut === 'en_usage')
    .reduce((sum, s) => sum + (s.quantiteRestante || 0), 0);

  // ── Movement breakdown ──
  const mouvementCounts = {
    entree_stock: mouvements.filter((m) => m.type === 'entree_stock').length,
    sortie_pepiniere: mouvements.filter((m) => m.type === 'sortie_pepiniere').length,
    bon_passage: mouvements.filter((m) => m.type === 'bon_passage').length,
    test_germination: mouvements.filter((m) => m.type === 'test_germination').length,
  };
  const totalSortiePepiniere = mouvements
    .filter((m) => m.type === 'sortie_pepiniere')
    .reduce((sum, m) => sum + (m.quantite || 0), 0);
  const totalBonPassage = mouvements
    .filter((m) => m.type === 'bon_passage')
    .reduce((sum, m) => sum + (m.quantite || 0), 0);
  const totalTestGermination = mouvements
    .filter((m) => m.type === 'test_germination')
    .reduce((sum, m) => sum + (m.quantite || 0), 0);

  // ── Yield analysis per variety ──
  // For each stock entry that had movements to pepinieres,
  // find the corresponding production lots and calculate yield.
  const yieldByVariete = [];

  // Group stock by variete
  const stockByVariete = {};
  stock.forEach((s) => {
    const vId = s.variete?._id?.toString() || s.variete?.toString();
    if (!vId) return;
    if (!stockByVariete[vId]) {
      stockByVariete[vId] = {
        variete: s.variete,
        quantiteInitiale: 0,
        quantiteSortie: 0,
      };
    }
    stockByVariete[vId].quantiteInitiale += s.quantiteInitiale || 0;
  });

  // Add movement quantities per variete
  const semisIds = [];
  mouvements.forEach((m) => {
    if (m.semisCree) {
      semisIds.push(m.semisCree._id || m.semisCree);
    }
  });

  // For each semis created from stock, find production lots
  if (semisIds.length > 0) {
    const productionLots = await Lot.find({
      type: 'production',
      semis: { $in: semisIds },
    })
      .select('semis nombrePlantsProduits quantite')
      .lean();

    // Build map: semisId -> { planted, produced }
    const productionBySemis = {};
    productionLots.forEach((lot) => {
      const sId = lot.semis?.toString();
      if (!sId) return;
      if (!productionBySemis[sId]) {
        productionBySemis[sId] = { planted: 0, produced: 0 };
      }
      productionBySemis[sId].planted += lot.quantite || 0;
      productionBySemis[sId].produced += lot.nombrePlantsProduits || 0;
    });

    // Map movements to yield
    const varieteYieldMap = {};
    mouvements.forEach((m) => {
      if (m.type !== 'sortie_pepiniere' || !m.semisCree) return;
      const sId = m.semisCree._id?.toString() || m.semisCree?.toString();
      if (!sId) return;
      const prod = productionBySemis[sId];
      if (!prod) return;

      // Find which variete this stock belongs to
      // We need the stock entry for this movement
      const stockEntry = stock.find((s) => s._id.toString() === m.stockSemence?.toString());
      if (!stockEntry || !stockEntry.variete) return;
      const vId = stockEntry.variete._id?.toString() || stockEntry.variete?.toString();
      if (!vId) return;

      if (!varieteYieldMap[vId]) {
        varieteYieldMap[vId] = {
          variete: stockEntry.variete,
          totalPlanted: 0,
          totalProduced: 0,
        };
      }
      varieteYieldMap[vId].totalPlanted += prod.planted;
      varieteYieldMap[vId].totalProduced += prod.produced;
    });

    Object.values(varieteYieldMap).forEach((entry) => {
      const rendement = entry.totalPlanted > 0
        ? Math.round((entry.totalProduced / entry.totalPlanted) * 100)
        : entry.totalProduced > 0 ? 0 : null;
      yieldByVariete.push({
        variete: entry.variete,
        totalPlanted: entry.totalPlanted,
        totalProduced: entry.totalProduced,
        rendement,
      });
    });
  }

  return {
    totalEntries,
    totalInitial,
    totalRestant,
    totalUtilise,
    tauxUtilisationGlobal,
    statusBreakdown,
    disponibleQte,
    enUsageQte,
    mouvementCounts,
    totalSortiePepiniere,
    totalBonPassage,
    totalTestGermination,
    yieldByVariete,
  };
};

/**
 * Compute the best available germination rate for a stock entry.
 * Priority: latest formal test > manual rate > null
 */
const computeTauxGermination = (stock) => {
  if (stock.germinationTests && stock.germinationTests.length > 0) {
    // Tests are sorted newest-first by getById
    const latestTest = stock.germinationTests[0];
    if (latestTest && latestTest.grainesTestees > 0) {
      return Math.round((latestTest.grainesGermees / latestTest.grainesTestees) * 100);
    }
  }
  if (stock.tauxManuel != null) {
    return stock.tauxManuel;
  }
  return null;
};

/**
 * Set or clear manual germination rate on a stock entry.
 */
const setManualRate = async (stockId, tauxManuel) => {
  const stock = await StockSemence.findById(stockId);
  if (!stock) throw new AppError('Stock non trouvé', 404);

  // If setting a value, validate range
  if (tauxManuel != null) {
    const rate = Number(tauxManuel);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      throw new AppError('Le taux de germination doit être entre 0 et 100', 400);
    }
    stock.tauxManuel = rate;
  } else {
    // Clear manual rate
    stock.tauxManuel = null;
  }

  await stock.save();

  return StockSemence.findById(stockId)
    .populate('variete', 'nom code')
    .populate('fournisseur', 'nom code')
    .populate('germinationTests')
    .lean();
};

/**
 * Create a formal germination test on a stock entry.
 * Consumes grainesTestees from the stock's available quantity
 * (decrements quantiteRestante) since the seeds are physically used.
 * Also creates a StockMouvement entry for audit trail.
 * Clears the manual tauxManuel if a test exists.
 */
const createGerminationTest = async (stockId, data, userId) => {
  const stock = await StockSemence.findById(stockId);
  if (!stock) throw new AppError('Stock non trouvé', 404);

  const grainesTestees = Number(data.grainesTestees);
  const grainesGermees = Number(data.grainesGermees);

  if (isNaN(grainesTestees) || grainesTestees <= 0) {
    throw new AppError('Le nombre de graines testées est requis et doit être supérieur à 0', 400);
  }
  if (isNaN(grainesGermees) || grainesGermees < 0 || grainesGermees > grainesTestees) {
    throw new AppError(`Le nombre de graines germées doit être entre 0 et ${grainesTestees}`, 400);
  }

  // ── Date validation: test date must be >= reception date ──
  if (data.dateTest && stock.dateReception) {
    const testDate = new Date(data.dateTest);
    const recDate = new Date(stock.dateReception);
    recDate.setHours(0, 0, 0, 0);
    testDate.setHours(0, 0, 0, 0);
    if (testDate < recDate) {
      throw new AppError(
        `La date du test (${testDate.toLocaleDateString('fr-FR')}) ne peut pas être antérieure à la date de réception (${recDate.toLocaleDateString('fr-FR')}).`,
        400
      );
    }
  }

  // ── Validate test date is not in the future ──
  if (data.dateTest) {
    const testDate = new Date(data.dateTest);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (testDate > today) {
      throw new AppError('La date du test ne peut pas être dans le futur.', 400);
    }
  }

  // ── Stock consumption validation ──
  if (grainesTestees > stock.quantiteRestante) {
    throw new AppError(
      `Stock insuffisant pour le test : ${grainesTestees} graines requises, mais seulement ${stock.quantiteRestante} disponibles`,
      400
    );
  }

  const test = await StockGerminationTest.create({
    stockSemence: stockId,
    dateTest: data.dateTest || new Date(),
    grainesTestees,
    grainesGermees,
  });

  // ── Create audit trail movement ──
  const tauxCalcule = grainesTestees > 0 ? Math.round((grainesGermees / grainesTestees) * 100) : 0;
  await StockMouvement.create({
    stockSemence: stockId,
    type: 'test_germination',
    quantite: grainesTestees,
    dateMouvement: data.dateTest || new Date(),
    motif: `Test de germination : ${grainesTestees} testées, ${grainesGermees} germées → ${tauxCalcule}%`,
    germinationTestRef: test._id,
    createdBy: userId,
  });

  // ── Decrease stock quantity ──
  // The seeds used for the test are physically consumed
  stock.quantiteRestante -= grainesTestees;

  // Clear manual rate once a formal test exists
  stock.tauxManuel = null;
  await stock.save();

  // ── Real-time notification if stock became ended ──
  if (stock.statut === 'epuise') {
    try {
      const { getIO } = require('./socketService');
      const io = getIO();
      if (io) {
        io.emit('stock:ended', {
          stockId: stock._id,
          code: stock.code,
          variete: stock.variete,
          quantiteInitiale: stock.quantiteInitiale,
          quantiteUtilisee: stock.quantiteInitiale,
          timestamp: new Date().toISOString(),
        });
        console.log(`[Socket.IO] Emitted stock:ended for ${stock.code}`);
      }
    } catch (e) {
      // Socket notification is non-critical
    }
  }

  return test;
};

/**
 * Delete a germination test and its associated movement.
 * NOTE: Does NOT restore stock quantity since seeds were physically consumed.
 */
const deleteGerminationTest = async (testId) => {
  const test = await StockGerminationTest.findByIdAndDelete(testId);
  if (!test) throw new AppError('Test non trouvé', 404);

  // Delete the associated movement (audit trail)
  await StockMouvement.findOneAndDelete({ germinationTestRef: testId });

  return test;
};

/**
 * Get all germination tests for a stock entry.
 */
const getGerminationTests = async (stockId) => {
  return StockGerminationTest.find({ stockSemence: stockId })
    .sort({ dateTest: -1 })
    .lean();
};

/**
 * Get ALL germination tests across all stock entries (global view).
 * Computes tauxGermination inline since .lean() skips virtuals.
 */
const getAllGerminationTests = async () => {
  const tests = await StockGerminationTest.find({})
    .populate({
      path: 'stockSemence',
      select: 'code variete tauxManuel quantiteRestante quantiteInitiale',
      populate: { path: 'variete', select: 'nom' },
    })
    .sort({ dateTest: -1 })
    .lean();

  // Compute virtual tauxGermination since .lean() doesn't include it
  tests.forEach((t) => {
    t.tauxGermination = t.grainesTestees > 0
      ? Math.round((t.grainesGermees / t.grainesTestees) * 10000) / 100
      : 0;
  });

  return tests;
};

/**
 * Get stock health overview for alerts and dashboard.
 * Returns:
 *   - Stock entries with low availability (< 20% remaining)
 *   - Stock entries with no germination rate
 *   - Stock entries with bad germination rate (< 40%)
 *   - Aggregate health summary
 */
const getStockHealth = async () => {
  const stock = await StockSemence.find({})
    .populate('variete', 'nom code')
    .populate('germinationTests')
    .lean();

  // Group by variete for variety-level analysis
  const byVariete = {};
  stock.forEach((entry) => {
    const vId = entry.variete?._id?.toString() || entry.variete?.toString();
    if (!vId) return;
    if (!byVariete[vId]) {
      byVariete[vId] = { variete: entry.variete, totalRestant: 0, totalInitial: 0, entries: [] };
    }
    byVariete[vId].totalRestant += entry.quantiteRestante || 0;
    byVariete[vId].totalInitial += entry.quantiteInitiale || 0;
    byVariete[vId].entries.push(entry);
  });

  const varieteAlerts = [];
  Object.values(byVariete).forEach((group) => {
    // Get best germination rate for this variety
    const germRates = group.entries
      .map((e) => computeTauxGermination(e))
      .filter((r) => r != null);
    const bestGermRate = germRates.length > 0 ? Math.max(...germRates) : null;

    // Low stock check
    if (group.totalRestant < 200) {
      varieteAlerts.push({
        type: 'low_stock',
        severity: group.totalRestant === 0 ? 'critical' : 'warning',
        variete: group.variete,
        message: group.totalRestant === 0
          ? `Stock épuisé pour ${group.variete?.nom || 'cette variété'}`
          : `Stock faible : ${group.totalRestant} graines restantes pour ${group.variete?.nom || 'cette variété'}`,
        reste: group.totalRestant,
      });
    }

    // Missing germination rate
    if (bestGermRate === null) {
      varieteAlerts.push({
        type: 'no_germination',
        severity: 'warning',
        variete: group.variete,
        message: `Aucun taux de germination pour ${group.variete?.nom || 'cette variété'}`,
      });
    } else if (bestGermRate < 40) {
      varieteAlerts.push({
        type: 'bad_germination',
        severity: 'critical',
        variete: group.variete,
        message: `Taux de germination très bas (${bestGermRate}%) pour ${group.variete?.nom || 'cette variété'}`,
        taux: bestGermRate,
      });
    }
  });

  // Compute counts
  const totalEntries = stock.length;
  const totalInitial = stock.reduce((s, e) => s + (e.quantiteInitiale || 0), 0);
  const totalRestant = stock.reduce((s, e) => s + (e.quantiteRestante || 0), 0);
  const tauxUtilisationGlobal = totalInitial > 0
    ? Math.round(((totalInitial - totalRestant) / totalInitial) * 100)
    : 0;

  return {
    totalEntries,
    totalInitial,
    totalRestant,
    tauxUtilisationGlobal,
    varieteAlerts,
    alertCount: varieteAlerts.filter((a) => a.severity === 'critical').length,
    warningCount: varieteAlerts.filter((a) => a.severity === 'warning').length,
  };
};

/**
 * SICAM Production Statistics — Company-level production overview.
 * Returns:
 *   - Total seeds received
 *   - Total seeds sent to nurseries
 *   - Total plants produced
 *   - Total plants delivered
 *   - Estimated production from remaining stock
 *   - Yield analysis per variety
 */
const getSicamStats = async () => {
  const ProductionRecord = require('../models/ProductionRecord');
  const stock = await StockSemence.find({})
    .populate('variete', 'nom code')
    .populate('germinationTests')
    .lean();

  const mouvements = await StockMouvement.find({})
    .populate('semisCree', 'code')
    .lean();

  const productionRecords = await ProductionRecord.find({}).lean();

  // ── Totals from stock ──
  const totalSeedsReceived = stock.reduce((s, e) => s + (e.quantiteInitiale || 0), 0);
  const totalSeedsRemaining = stock.reduce((s, e) => s + (e.quantiteRestante || 0), 0);

  // ── Seeds sent to nurseries (sortie_pepiniere) ──
  const seedsToNurseries = mouvements
    .filter((m) => m.type === 'sortie_pepiniere')
    .reduce((s, m) => s + (m.quantite || 0), 0);

  // ── Production from records ──
  const totalPlantsProduced = productionRecords.reduce((s, r) => s + (r.quantiteProduite || 0), 0);
  const totalPlantsDelivered = productionRecords.reduce((s, r) => s + (r.quantiteLivree || 0), 0);

  // ── Current active production (lots en cours) ──
  const activeLots = await Lot.find({ type: 'production', statut: { $in: ['en_cours', 'pret', 'recolte'] } })
    .select('quantite nombrePlantsProduits quantiteLivree')
    .lean();
  const currentProduction = activeLots.reduce((s, l) => s + (l.nombrePlantsProduits || 0), 0);

  // ── Estimated future production from remaining stock ──
  let estimatedFuturePlants = 0;
  stock.forEach((entry) => {
    const taux = computeTauxGermination(entry);
    if (taux != null && entry.quantiteRestante > 0) {
      estimatedFuturePlants += Math.round((entry.quantiteRestante * taux) / 100);
    }
  });

  // ── Yield by variety (from production records) ──
  const yieldByVariete = [];
  const prodByVariete = {};
  productionRecords.forEach((r) => {
    const key = r.varieteId?.toString() || r.variete;
    if (!key) return;
    if (!prodByVariete[key]) {
      prodByVariete[key] = { variete: r.variete, planted: 0, produced: 0, delivered: 0 };
    }
    prodByVariete[key].planted += r.quantitePlantee || 0;
    prodByVariete[key].produced += r.quantiteProduite || 0;
    prodByVariete[key].delivered += r.quantiteLivree || 0;
  });

  Object.entries(prodByVariete).forEach(([key, data]) => {
    const rendement = data.planted > 0 ? Math.round((data.produced / data.planted) * 100) : null;
    const deliveryRate = data.produced > 0 ? Math.round((data.delivered / data.produced) * 100) : null;
    yieldByVariete.push({
      variete: data.variete,
      planted: data.planted,
      produced: data.produced,
      delivered: data.delivered,
      rendement,
      deliveryRate,
    });
  });

  // ── Projection per variety (from remaining stock) ──
  const projections = [];
  const stockByVariete = {};
  stock.forEach((entry) => {
    const vId = entry.variete?._id?.toString() || entry.variete?.toString();
    if (!vId) return;
    if (!stockByVariete[vId]) {
      stockByVariete[vId] = { variete: entry.variete, totalRestant: 0, bestTaux: null };
    }
    stockByVariete[vId].totalRestant += entry.quantiteRestante || 0;
    const taux = computeTauxGermination(entry);
    if (taux != null && (stockByVariete[vId].bestTaux === null || taux > stockByVariete[vId].bestTaux)) {
      stockByVariete[vId].bestTaux = taux;
    }
  });

  Object.values(stockByVariete).forEach((group) => {
    const estPlants = group.bestTaux != null
      ? Math.round((group.totalRestant * group.bestTaux) / 100)
      : null;
    projections.push({
      variete: group.variete,
      stockRestant: group.totalRestant,
      tauxGermination: group.bestTaux,
      estimationPlants: estPlants,
    });
  });

  const overallYield = seedsToNurseries > 0
    ? Math.round((totalPlantsProduced / seedsToNurseries) * 100)
    : null;

  return {
    totalSeedsReceived,
    totalSeedsRemaining,
    seedsToNurseries,
    totalPlantsProduced,
    totalPlantsDelivered,
    currentProduction,
    estimatedFuturePlants,
    overallYield,
    yieldByVariete,
    projections,
    recordCount: productionRecords.length,
  };
};

/**
 * Get stock-level yield/performance data.
 * For each stock entry, traces the full pipeline:
 *   Stock → Movement → Semis → Production Lots → Harvest → Delivery
 * Returns yield metrics per stock.
 */
const getStockYield = async () => {
  const stock = await StockSemence.find({})
    .populate('variete', 'nom code')
    .populate('fournisseur', 'nom')
    .populate('germinationTests')
    .lean();

  // IMPORTANT: Do NOT populate semisCree — use raw ObjectId only.
  // Populate runs a hidden `Semis.find({ _id: { $in: [...] } })` which
  // throws a CastError if any stored reference is malformed.
  const mouvements = await StockMouvement.find({})
    .select('stockSemence type quantite semisCree')
    .lean();

  // ── Batch: collect ALL semis IDs (validated) ──
  const validSemisIds = [];
  const stockMouvementMap = {}; // stockId -> mouvement[]

  for (const m of mouvements) {
    const sId = m.stockSemence?.toString();
    if (!sId) continue;
    if (!stockMouvementMap[sId]) stockMouvementMap[sId] = [];
    stockMouvementMap[sId].push(m);

    // Collect raw semisCree ObjectId; validate it before using in queries
    if (m.type === 'sortie_pepiniere' && m.semisCree) {
      const rawId = m.semisCree.toString();
      if (mongoose.Types.ObjectId.isValid(rawId)) {
        validSemisIds.push(rawId);
      }
    }
  }

  // ── Single batch query for ALL production lots linked to any semis ──
  let productionLotsBySemis = {}; // semisId -> { planted, produced, delivered }
  if (validSemisIds.length > 0) {
    const uniqueSemisIds = [...new Set(validSemisIds)];
    const productionLots = await Lot.find({
      type: 'production',
      semis: { $in: uniqueSemisIds },
    })
      .select('quantite nombrePlantsProduits quantiteLivree statut semis')
      .lean();

    productionLotsBySemis = {};
    for (const lot of productionLots) {
      const sId = lot.semis?.toString();
      if (!sId) continue;
      if (!productionLotsBySemis[sId]) {
        productionLotsBySemis[sId] = { quantite: 0, nombrePlantsProduits: 0, quantiteLivree: 0 };
      }
      productionLotsBySemis[sId].quantite += lot.quantite || 0;
      productionLotsBySemis[sId].nombrePlantsProduits += lot.nombrePlantsProduits || 0;
      if (lot.statut === 'livre') {
        productionLotsBySemis[sId].quantiteLivree += lot.quantiteLivree || 0;
      }
    }
  }

  // ── Aggregate per stock ──
  const result = [];

  for (const s of stock) {
    const sId = s._id.toString();
    const stockMouvements = stockMouvementMap[sId] || [];

    const sortiesPepiniere = stockMouvements.filter((m) => m.type === 'sortie_pepiniere');
    const totalSortiePepiniere = sortiesPepiniere.reduce((sum, m) => sum + (m.quantite || 0), 0);
    const totalBonPassage = stockMouvements
      .filter((m) => m.type === 'bon_passage')
      .reduce((sum, m) => sum + (m.quantite || 0), 0);
    const totalTestGermination = stockMouvements
      .filter((m) => m.type === 'test_germination')
      .reduce((sum, m) => sum + (m.quantite || 0), 0);

    // Look up production lots using validated raw ObjectIds
    const semisIds = sortiesPepiniere
      .filter((m) => m.semisCree)
      .map((m) => m.semisCree.toString())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    let totalPlanted = 0;
    let totalProduced = 0;
    let totalDelivered = 0;

    for (const semisId of semisIds) {
      const prod = productionLotsBySemis[semisId];
      if (prod) {
        totalPlanted += prod.quantite;
        totalProduced += prod.nombrePlantsProduits;
        totalDelivered += prod.quantiteLivree;
      }
    }

    const tauxGerm = computeTauxGermination(s);

    // Compute yield rates
    const semisToPlantYield = totalSortiePepiniere > 0
      ? Math.round((totalPlanted / totalSortiePepiniere) * 100)
      : null;
    const plantToHarvestYield = totalPlanted > 0
      ? Math.round((totalProduced / totalPlanted) * 100)
      : null;
    const harvestToDeliveryYield = totalProduced > 0
      ? Math.round((totalDelivered / totalProduced) * 100)
      : null;
    const overallYield = totalSortiePepiniere > 0
      ? Math.round((totalDelivered / totalSortiePepiniere) * 100)
      : null;

    result.push({
      _id: s._id,
      code: s.code,
      variete: s.variete,
      fournisseur: s.fournisseur,
      dateReception: s.dateReception,
      quantiteInitiale: s.quantiteInitiale,
      quantiteRestante: s.quantiteRestante,
      statut: s.statut,
      tauxGermination: tauxGerm,
      // Pipeline quantities
      sortiePepiniere: totalSortiePepiniere,
      bonPassage: totalBonPassage,
      testGermination: totalTestGermination,
      quantitePlantee: totalPlanted,
      plantesProduites: totalProduced,
      plantesLivrees: totalDelivered,
      // Yield rates
      rendementSemis: semisToPlantYield,
      rendementProduction: plantToHarvestYield,
      rendementLivraison: harvestToDeliveryYield,
      rendementGlobal: overallYield,
    });
  }

  // Sort by code
  result.sort((a, b) => (a.code || '').localeCompare(b.code || ''));

  // Aggregate totals
  const totals = {
    totalInitial: result.reduce((s, r) => s + r.quantiteInitiale, 0),
    totalRestant: result.reduce((s, r) => s + r.quantiteRestante, 0),
    totalSortiePepiniere: result.reduce((s, r) => s + r.sortiePepiniere, 0),
    totalBonPassage: result.reduce((s, r) => s + r.bonPassage, 0),
    totalTestGermination: result.reduce((s, r) => s + r.testGermination, 0),
    totalPlantee: result.reduce((s, r) => s + r.quantitePlantee, 0),
    totalProduite: result.reduce((s, r) => s + r.plantesProduites, 0),
    totalLivree: result.reduce((s, r) => s + r.plantesLivrees, 0),
  };

  return { entries: result, totals };
};

module.exports = {
  getAll,
  getById,
  create,
  remove,
  createMovement,
  getAllMovements,
  getStats,
  setManualRate,
  createGerminationTest,
  deleteGerminationTest,
  getGerminationTests,
  getAllGerminationTests,
  computeTauxGermination,
  createBatch,
  getStockHealth,
  getSicamStats,
  getStockYield,
};
