/**
 * Activity Service — Aggregate All Events for Activity Log
 * ==========================================================
 *
 * Collects and normalises events from:
 *   - Semis creation
 *   - Lot creation (production)
 *   - Germination test results
 *   - Lot status changes (en_cours → pret → recolte → livre)
 *   - Observations / notes
 *   - Deliveries
 *
 * Returns a single sorted timeline array.
 */

const Lot = require('../models/Lot');
const Semis = require('../models/Semis');
const StockMouvement = require('../models/StockMouvement');
const ActivityLog = require('../models/ActivityLog');

/**
 * Fetch all activity events across the system.
 * @param {Object} user - req.user for role filtering
 * @returns {Array} Sorted timeline of events
 */
const getAllActivity = async (user) => {
  const events = [];

  // ── 0. Stock movement events (entree_stock, sortie_pepiniere, bon_passage, test_germination) ──
  const mouvements = await StockMouvement.find({})
    .populate({ path: 'stockSemence', select: 'code variete', populate: { path: 'variete', select: 'nom' } })
    .populate('pepiniere', 'nom')
    .populate('createdBy', 'nom')
    .lean();

  mouvements.forEach((m) => {
    const stockCode = m.stockSemence?.code || '—';
    const stockVariete = m.stockSemence?.variete?.nom || null;
    const pepName = m.pepiniere?.nom;
    const userName = m.createdBy?.nom || 'Système';

    switch (m.type) {
      case 'entree_stock':
        events.push({
          date: m.dateMouvement || m.createdAt,
          type: 'stock_entree',
          label: 'Entrée stock',
          entity: stockCode,
          variete: stockVariete,
          pepiniere: null,
          details: `${m.quantite} graines reçues`,
          user: userName,
          entityId: m.stockSemence?._id,
          entityPath: m.stockSemence?._id ? `/stock/${m.stockSemence._id}` : null,
        });
        break;

      case 'sortie_pepiniere':
        events.push({
          date: m.dateMouvement || m.createdAt,
          type: 'stock_sortie_pepiniere',
          label: 'Sortie pépinière',
          entity: stockCode,
          variete: stockVariete,
          pepiniere: pepName,
          details: `${m.quantite} graines vers ${pepName || '?'}`,
          user: userName,
          entityId: m.semisCree?._id || m.stockSemence?._id,
          entityPath: m.semisCree?._id ? `/semis/${m.semisCree._id}` : (m.stockSemence?._id ? `/stock/${m.stockSemence._id}` : null),
        });
        break;

      case 'bon_passage':
        events.push({
          date: m.dateMouvement || m.createdAt,
          type: 'stock_bon_passage',
          label: 'Bon de passage',
          entity: stockCode,
          variete: stockVariete,
          pepiniere: null,
          details: `${m.quantite} graines — ${m.motif || 'Sans motif'}`,
          user: userName,
          entityId: m.stockSemence?._id,
          entityPath: m.stockSemence?._id ? `/stock/${m.stockSemence._id}` : null,
        });
        break;

      case 'test_germination':
        events.push({
          date: m.dateMouvement || m.createdAt,
          type: 'stock_test_germination',
          label: 'Test germination',
          entity: stockCode,
          variete: stockVariete,
          pepiniere: null,
          details: `${m.quantite} graines testées — ${m.motif || ''}`,
          user: userName,
          entityId: m.stockSemence?._id,
          entityPath: m.stockSemence?._id ? `/stock/${m.stockSemence._id}` : null,
        });
        break;
    }
  });

  // ── 1. Semis creation events ───────────────────────────────
  let semisQuery = {};
  if (user && user.role === 'ingenieur') {
    const { getPepiniereIdsForUser } = require('../utils/roleFilter');
    const pepIds = await getPepiniereIdsForUser(user);
    if (pepIds) {
      semisQuery.pepiniere = { $in: pepIds.length > 0 ? pepIds : ['__none__'] };
    }
  }

  const semis = await Semis.find(semisQuery)
    .populate('variete', 'nom')
    .populate('pepiniere', 'nom')
    .populate('createdBy', 'nom')
    .lean();

  semis.forEach((s) => {
    events.push({
      date: s.createdAt || s._id.getTimestamp(),
      type: 'semis_creation',
      label: 'Semis créé',
      entity: s.code,
      variete: s.variete?.nom,
      pepiniere: s.pepiniere?.nom,
      details: `${s.quantite} graines`,
      user: s.createdBy?.nom || 'Système',
      entityId: s._id,
      entityPath: `/semis/${s._id}`,
    });
  });

  // ── 0b. ActivityLog entries (updates, deletions, admin CRUD) ──
  const activityLogs = await ActivityLog.find({})
    .populate('user', 'nom')
    .lean();

  const ACTIVITY_LABELS = {
    'semis': { create: 'Semis créé', update: 'Semis mis à jour', delete: 'Semis supprimé' },
    'stock': { delete: 'Stock supprimé', update: 'Taux germination mis à jour' },
    'pepiniere': { create: 'Pépinière créée', update: 'Pépinière mise à jour', delete: 'Pépinière supprimée', assign: 'Ingénieur assigné', remove_assign: 'Ingénieur retiré' },
    'variete': { create: 'Variété créée', update: 'Variété mise à jour', delete: 'Variété supprimée' },
    'fournisseur': { create: 'Fournisseur créé', update: 'Fournisseur mis à jour', delete: 'Fournisseur supprimé' },
    'user': { create: 'Utilisateur créé', update: 'Utilisateur mis à jour', delete: 'Utilisateur supprimé' },
    'production_rule': { create: 'Cycle créé', update: 'Cycle mis à jour', delete: 'Cycle supprimé' },
  };
  const ACTIVITY_TYPE_MAP = {
    'semis': { create: 'admin_semis_created', update: 'admin_semis_updated', delete: 'admin_semis_deleted' },
    'stock': { delete: 'admin_stock_deleted', update: 'admin_stock_taux_updated' },
    'pepiniere': { create: 'admin_pepiniere_created', update: 'admin_pepiniere_updated', delete: 'admin_pepiniere_deleted', assign: 'admin_pepiniere_assigned', remove_assign: 'admin_pepiniere_unassigned' },
    'variete': { create: 'admin_variete_created', update: 'admin_variete_updated', delete: 'admin_variete_deleted' },
    'fournisseur': { create: 'admin_fournisseur_created', update: 'admin_fournisseur_updated', delete: 'admin_fournisseur_deleted' },
    'user': { create: 'admin_user_created', update: 'admin_user_updated', delete: 'admin_user_deleted' },
    'production_rule': { create: 'admin_rule_created', update: 'admin_rule_updated', delete: 'admin_rule_deleted' },
  };

  activityLogs.forEach((log) => {
    const labels = ACTIVITY_LABELS[log.entityType] || {};
    const label = labels[log.action] || `${log.entityType} ${log.action}`;
    const typeMap = ACTIVITY_TYPE_MAP[log.entityType] || {};
    const eventType = typeMap[log.action] || `admin_${log.entityType}_${log.action}`;

    events.push({
      date: log.createdAt,
      type: eventType,
      label,
      entity: log.entityCode || '',
      variete: null,
      pepiniere: null,
      details: log.details || '',
      user: log.user?.nom || 'Système',
      entityId: log.entityId,
      entityPath: log.entityId ? (() => {
        switch (log.entityType) {
          case 'semis': return `/semis/${log.entityId}`;
          case 'stock': return `/stock/${log.entityId}`;
          case 'pepiniere': return `/pepinieres/${log.entityId}`;
          case 'variete': return `/varietes/${log.entityId}`;
          case 'fournisseur': return `/fournisseurs/${log.entityId}`;
          case 'user': return `/users/${log.entityId}`;
          case 'production_rule': return `/cycles-de-semis`;
          default: return null;
        }
      })() : null,
    });
  });

  // ── 2. Lot events (creation, recolte, livraison, notes) ────
  let lotQuery = {};
  if (user && user.role === 'ingenieur') {
    const scopedSemis = await Semis.find(semisQuery).select('_id').lean();
    const semisIds = scopedSemis.map((s) => s._id);
    lotQuery.semis = { $in: semisIds.length > 0 ? semisIds : ['__none__'] };
  }

  const lots = await Lot.find(lotQuery)
    .populate({
      path: 'semis',
      select: 'variete pepiniere',
      populate: [
        { path: 'variete', select: 'nom' },
        { path: 'pepiniere', select: 'nom' },
      ],
    })
    .populate({ path: 'events.user', select: 'nom' })
    .populate({ path: 'observations.user', select: 'nom' })
    .select('code type statut quantite dateEntree dateRecolte dateLivraison nombrePlantsProduits quantiteLivree events observations lotSemenceParent')
    .lean();

  lots.forEach((lot) => {
    const pepName = lot.semis?.pepiniere?.nom;
    const varName = lot.semis?.variete?.nom;
    const typeLabel = 'PR';

    // Lot creation event (from dateEntree)
    events.push({
      date: lot.dateEntree || lot._id.getTimestamp(),
      type: 'lot_creation',
      label: 'Lot production créé',
      entity: lot.code,
      variete: varName,
      pepiniere: pepName,
      details: lot.quantite ? `${lot.quantite} graines` : '',
      user: 'Système',
      entityId: lot._id,
      entityPath: `/lots/${lot._id}`,
      lotType: lot.type,
    });

    // Events from the events array (recolte, livraison, note)
    if (lot.events && lot.events.length > 0) {
      lot.events.forEach((evt) => {
        const eventLabels = {
          recolte: { label: 'Lot récolté', details: lot.nombrePlantsProduits ? `${lot.nombrePlantsProduits} plantes produites` : '' },
          livraison: { label: 'Lot livré', details: lot.quantiteLivree ? `${lot.quantiteLivree} plantes livrées` : '' },
          note: { label: 'Note ajoutée', details: evt.message || '' },
          creation: { label: 'Lot créé', details: '' },
        };
        const cfg = eventLabels[evt.type] || { label: evt.type, details: evt.message || '' };

        events.push({
          date: evt.date || lot._id.getTimestamp(),
          type: `lot_${evt.type}`,
          label: cfg.label,
          entity: lot.code,
          variete: varName,
          pepiniere: pepName,
          details: cfg.details,
          user: evt.user?.nom || 'Système',
          entityId: lot._id,
          entityPath: `/lots/${lot._id}`,
          lotType: lot.type,
        });
      });
    }

    // Observations as separate events
    if (lot.observations && lot.observations.length > 0) {
      lot.observations.forEach((obs) => {
        const details = [];
        if (obs.germinationJ7 != null) details.push(`J7: ${obs.germinationJ7}%`);
        if (obs.germinationJ14 != null) details.push(`J14: ${obs.germinationJ14}%`);
        if (obs.message) details.push(obs.message);

        events.push({
          date: obs.date || lot._id.getTimestamp(),
          type: 'observation',
          label: 'Observation',
          entity: lot.code,
          variete: varName,
          pepiniere: pepName,
          details: details.join(' — '),
          user: obs.user?.nom || 'Système',
          entityId: lot._id,
          entityPath: `/lots/${lot._id}`,
          lotType: lot.type,
        });
      });
    }
  });

  // ── Sort by date descending ────────────────────────────────
  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  return events;
};

module.exports = { getAllActivity };
