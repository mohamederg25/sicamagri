/**
 * Socket Service — Real-Time Anomaly Notifications
 * ==================================================
 *
 * Uses Socket.IO + MongoDB Change Streams to detect anomalies
 * in real-time and push notifications to connected clients.
 *
 * Architecture:
 *   MongoDB Change Streams → computeAnomalies() → Socket.IO emit
 *
 * Note: No JWT auth on WebSocket since the JWT is httpOnly (not accessible
 * to JavaScript). Anomaly data is already accessible via the REST API, so
 * real-time updates are unauthenticated at the socket level.
 */

const { Server } = require('socket.io');
const Semis = require('../models/Semis');
const Lot = require('../models/Lot');

let io = null;

// ── Track connected users (for stats only) ──
let connectedCount = 0;
const knownAnomalyKeys = new Set(); // Set of "semisId-anomalyType" to track new anomalies

/**
 * Initialize Socket.IO server attached to the HTTP server.
 */
const initSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
      credentials: true,
    },
  });

  // ── Connection handler ──
  io.on('connection', (socket) => {
    connectedCount++;
    console.log(`[Socket.IO] Client connected (${connectedCount} total connections)`);

    // Send the current anomaly count as an initial snapshot
    socket.emit('anomaly:snapshot', { count: knownAnomalyKeys.size });

    socket.on('disconnect', () => {
      connectedCount--;
    });
  });

  // ── Start anomaly change stream ──
  startAnomalyWatcher();

  console.log('[Socket.IO] Real-time notification service initialized');
  return io;
};

/**
 * Watch MongoDB for changes that could affect anomalies.
 * Uses change streams on Semis and Lots collections.
 */
const startAnomalyWatcher = async () => {
  /**
   * Try to start a change stream with error handling and a fallback to polling.
   * Change streams require a MongoDB replica set — on standalone instances they
   * fail with MongoServerError, so we need to catch the error event on the cursor.
   */
  const tryWatch = (model, name) => {
    try {
      const stream = model.watch([], { fullDocument: 'updateLookup' });
      stream.on('change', async (change) => {
        if (['insert', 'update', 'replace'].includes(change.operationType)) {
          await checkAndEmitAnomalies();
        }
      });
      stream.on('error', (err) => {
        console.error(`[Socket.IO] ${name} change stream error:`, err.message);
        // The stream is now dead — polling fallback below will take over
      });
      return stream;
    } catch (err) {
      console.error(`[Socket.IO] Failed to start ${name} change stream:`, err.message);
      return null;
    }
  };

  try {
    const semisStream = tryWatch(Semis, 'Semis');
    const lotsStream = tryWatch(Lot, 'Lots');

    // Always set up periodic polling (every 60s) as a safety net.
    // Change streams may start successfully but fail asynchronously later
    // (e.g., on standalone MongoDB), so polling ensures anomaly detection stays alive.
    const pollingInterval = setInterval(async () => {
      await checkAndEmitAnomalies();
    }, 60000);

    // Run an initial scan on startup
    setTimeout(async () => {
      await checkAndEmitAnomalies();
    }, 3000);

    if (semisStream && lotsStream) {
      console.log('[Socket.IO] MongoDB change streams active + polling backup (every 60s)');
    } else {
      console.warn('[Socket.IO] Change streams unavailable — polling only (every 60s)');
    }
  } catch (err) {
    console.error('[Socket.IO] Failed to start anomaly watcher:', err.message);
    console.log('[Socket.IO] Falling back to periodic polling (every 60s)');
    setInterval(async () => {
      await checkAndEmitAnomalies();
    }, 60000);
  }
};

/**
 * Compute anomalies and emit notifications for any NEW anomalies.
 * Compares against known anomalies to only notify on new ones.
 */
const checkAndEmitAnomalies = async () => {
  if (!io) return;
  try {
    // Compute current anomalies using the existing service
    const { results, trends } = await computeSemisAnomaliesLight();

    // Check for new anomalies since last check
    const newAnomalies = [];
    results.forEach((semis) => {
      (semis.anomalies || []).forEach((anomaly) => {
        const key = `${semis._id}-${anomaly.type}`;
        if (!knownAnomalyKeys.has(key)) {
          knownAnomalyKeys.add(key);
          newAnomalies.push({
            semisId: semis._id,
            semisCode: semis.code,
            variete: semis.variete,
            pepiniere: semis.pepiniere,
            type: anomaly.type,
            severity: anomaly.severity,
            message: anomaly.message,
            timestamp: new Date().toISOString(),
          });
        }
      });
    });

    // Keep knownAnomalyKeys bounded — remove resolved anomalies
    // (anomalies no longer present)
    const currentKeys = new Set();
    results.forEach((semis) => {
      (semis.anomalies || []).forEach((anomaly) => {
        currentKeys.add(`${semis._id}-${anomaly.type}`);
      });
    });
    knownAnomalyKeys.forEach((key) => {
      if (!currentKeys.has(key)) knownAnomalyKeys.delete(key);
    });

    // Emit new anomalies to all connected clients
    if (newAnomalies.length > 0) {
      io.emit('anomaly:new', {
        anomalies: newAnomalies,
        count: newAnomalies.length,
        timestamp: new Date().toISOString(),
      });
      console.log(`[Socket.IO] Emitted ${newAnomalies.length} new anomaly notification(s)`);
    }

    // Also emit updated summary count periodically
    const criticalCount = results.filter((s) =>
      s.anomalies.some((a) => a.severity === 'critical')
    ).length;
    const totalWithAnomalies = results.filter((s) => s.hasAnomalies).length;

    io.emit('anomaly:summary', {
      totalWithAnomalies,
      totalAnomalies: knownAnomalyKeys.size,
      criticalCount,
      trends,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Socket.IO] Error checking anomalies:', err.message);
  }
};

/**
 * Lightweight version of computeSemisAnomalies for real-time use.
 * Fetches only essential fields for anomaly detection speed.
 */
const computeSemisAnomaliesLight = async () => {
  const semisList = await Semis.find({})
    .populate('variete', 'nom')
    .populate('pepiniere', 'nom')
    .lean();

  const prodLots = await Lot.find({ type: 'production' })
    .select('semis nombrePlantsProduits quantiteLivree quantite statut dateRecolte expectedReadyDateMax')
    .lean();

  const lotsBySemis = {};
  prodLots.forEach((lot) => {
    const semisId = lot.semis ? lot.semis.toString() : null;
    if (!semisId) return;
    if (!lotsBySemis[semisId]) lotsBySemis[semisId] = [];
    lotsBySemis[semisId].push(lot);
  });

  const germBySemis = {};
  semisList.forEach((semis) => {
    const id = semis._id.toString();
    germBySemis[id] = semis.tauxGermination ?? null;
  });

  const now = new Date();

  const results = semisList.map((semis) => {
    const id = semis._id.toString();
    const lots = lotsBySemis[id] || [];
    const tauxGermination = germBySemis[id];
    const totalPlanted = lots.reduce((sum, l) => sum + (l.quantite || 0), 0);
    const totalPlantsProduced = lots.reduce((sum, l) => sum + (l.nombrePlantsProduits || 0), 0);
    const totalDelivered = lots.reduce((sum, l) => sum + (l.quantiteLivree || 0), 0);
    const activeLots = lots.filter((l) => l.statut === 'en_cours' || l.statut === 'pret' || l.statut === 'recolte');

    const expectedPlants = null;

    const tauxUtilisation = semis.quantite > 0
      ? Math.round(((semis.quantiteUtilisee || 0) / semis.quantite) * 100)
      : null;

    const anomalies = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (semis.quantiteUtilisee === 0 && new Date(semis.createdAt) < sevenDaysAgo) {
      anomalies.push({ type: 'NO_USAGE', severity: 'warning', message: 'Semis jamais utilisé après 7 jours' });
    } else if (tauxUtilisation != null && tauxUtilisation < 30 && lots.length > 0) {
      anomalies.push({ type: 'LOW_UTILIZATION', severity: 'warning', message: `Faible utilisation (${tauxUtilisation}%)` });
    }

    if (tauxUtilisation != null && tauxUtilisation > 90) {
      anomalies.push({ type: 'HIGH_UTILIZATION', severity: 'info', message: `Stock quasi épuisé (${tauxUtilisation}% utilisé)` });
    }

    if (lots.length === 0 && semis.statut !== 'annulee') {
      anomalies.push({ type: 'NO_PRODUCTION', severity: 'critical', message: 'Aucun lot de production créé' });
    }

    if (expectedPlants != null && totalPlantsProduced > 0) {
      const variance = Math.round(((totalPlantsProduced - expectedPlants) / expectedPlants) * 100);
      if (variance < -30) {
        anomalies.push({ type: 'UNDER_PRODUCTION', severity: 'critical', message: `Production inférieure de ${Math.abs(variance)}% aux prévisions` });
      } else if (variance > 30) {
        anomalies.push({ type: 'OVER_PRODUCTION', severity: 'warning', message: `Production supérieure de ${variance}% aux prévisions` });
      }
    }

    if (lots.length > 0 && totalPlanted > 0 && totalPlantsProduced > 0) {
      const yieldRatio = Math.round((totalPlantsProduced / totalPlanted) * 100);
      const expectedYield = tauxGermination != null ? tauxGermination : 70;
      const yieldVariance = yieldRatio - expectedYield;
      if (yieldVariance < -20) {
        anomalies.push({ type: 'LOW_YIELD', severity: 'critical', message: `Rendement faible: ${yieldRatio}% vs ${expectedYield}% attendu` });
      } else if (yieldVariance > 20) {
        anomalies.push({ type: 'HIGH_YIELD', severity: 'warning', message: `Rendement élevé: ${yieldRatio}% vs ${expectedYield}% attendu` });
      }
    }

    if (totalPlantsProduced > 0) {
      const deliveryRate = Math.round((totalDelivered / totalPlantsProduced) * 100);
      if (totalDelivered === 0 && lots.some((l) => l.statut === 'livre' || l.statut === 'recolte')) {
        anomalies.push({ type: 'NO_DELIVERY', severity: 'critical', message: `Aucune livraison malgré ${totalPlantsProduced} plants` });
      } else if (deliveryRate < 70 && lots.some((l) => l.statut === 'livre' || l.statut === 'recolte')) {
        anomalies.push({ type: 'LOW_DELIVERY', severity: 'warning', message: `Seulement ${deliveryRate}% livré` });
      }
    }

    if (activeLots.length > 0 && semis.statut !== 'realisee') {
      const overdueLots = activeLots.filter((l) => l.expectedReadyDateMax && new Date(l.expectedReadyDateMax) < now);
      if (overdueLots.length > 0) {
        anomalies.push({ type: 'OVERDUE', severity: 'critical', message: `${overdueLots.length} lot(s) en retard` });
      }
    }

    if (tauxGermination == null && lots.length > 0) {
      anomalies.push({ type: 'NO_GERMINATION', severity: 'warning', message: 'Aucun taux de germination' });
    } else if (tauxGermination != null && tauxGermination < 40) {
      anomalies.push({ type: 'LOW_GERMINATION', severity: 'critical', message: `Germination basse (${tauxGermination}%)` });
    }

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
      anomalies,
      severityScore,
      hasAnomalies: anomalies.length > 0,
    };
  });

  results.sort((a, b) => b.severityScore - a.severityScore);

  return { results, trends: {} };
};

/**
 * Get the Socket.IO server instance (for use by other services).
 */
const getIO = () => io;

module.exports = {
  initSocketIO,
  getIO,
};
