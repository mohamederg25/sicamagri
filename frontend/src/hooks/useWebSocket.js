/**
 * useWebSocket — Hook for Real-Time Socket.IO Connection
 * ========================================================
 *
 * Manages a single socket connection to the backend for anomaly
 * notifications. Provides:
 *   - Connection state (connected / disconnected)
 *   - Incoming anomaly events (anomaly:new, anomaly:summary, anomaly:snapshot)
 *   - Automatic reconnection on disconnect
 *   - Cleans up on unmount
 *
 * Usage:
 *   const { connected, lastNotification, newAnomalies } = useWebSocket(userId);
 *   // lastNotification — latest anomaly event
 *   // newAnomalies — persistent queue of recent anomalies
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { playCriticalAlert, playWarningAlert } from '../utils/notificationSound';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

/* ── Save original page title on first import ── */
const ORIGINAL_TITLE = document.title;

const useWebSocket = (userId) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState(null);
  const [summary, setSummary] = useState(null);
  const [newAnomalies, setNewAnomalies] = useState([]);

  useEffect(() => {
    // Always create a connection — no auth required at socket level
    // (JWT is httpOnly; anomaly data is already public via REST API)
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected');
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
      setConnected(false);
    });

    // ── Initial snapshot of anomaly count ──
    socket.on('anomaly:snapshot', (data) => {
      setSummary((prev) => ({ ...prev, ...data }));
    });

    // ── New anomalies detected in real-time ──
    socket.on('anomaly:new', (data) => {
      setLastNotification({ type: 'anomaly', ...data });
      setNewAnomalies((prev) => [...data.anomalies, ...prev].slice(0, 50));

      // Play sound for critical anomalies
      if (data.anomalies && data.anomalies.length > 0) {
        const hasCritical = data.anomalies.some((a) => a.severity === 'critical');
        const hasWarning = data.anomalies.some((a) => a.severity === 'warning');

        if (hasCritical) {
          playCriticalAlert();
        } else if (hasWarning) {
          playWarningAlert();
        }
      }
    });

    // ── Summary update (periodic refresh) ──
    socket.on('anomaly:summary', (data) => {
      setSummary((prev) => ({ ...prev, ...data }));
    });

    // ── Stock ended notification — emitted when a stock becomes fully consumed ──
    socket.on('stock:ended', (data) => {
      const notification = {
        type: 'stock:ended',
        stockId: data.stockId,
        stockCode: data.code,
        severity: 'critical',
        variete: data.variete ? { nom: data.variete.nom || data.variete } : null,
        message: `Stock ${data.code} épuisé — ${data.quantiteInitiale} graines entièrement consommées`,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      setLastNotification({ type: 'stock:ended', ...data });
      setNewAnomalies((prev) => [notification, ...prev].slice(0, 50));
      playCriticalAlert();
    });

    // ── Semis transfer notification — emitted when semis are transferred between nurseries ──
    socket.on('semis:transferred', (data) => {
      const notification = {
        type: 'semis:transferred',
        semisId: data.destinationSemisId,
        semisCode: data.destinationSemisCode,
        sourceSemisCode: data.sourceSemisCode,
        severity: 'info',
        variete: data.variete,
        pepiniere: data.destinationPepiniere,
        message: `📦 Transfert reçu: ${data.quantite} graines de ${data.variete?.nom || '?'} transférées de ${data.sourcePepiniere?.nom || '?'} vers ${data.destinationPepiniere?.nom || '?'} (Semis ${data.destinationSemisCode})`,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      setLastNotification({ type: 'semis:transferred', ...data });
      setNewAnomalies((prev) => [notification, ...prev].slice(0, 50));
      playWarningAlert();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, []); // connect once on mount, always

  /**
   * Update document title with unread anomaly count.
   * Shows (N) prefix when there are unread anomalies.
   * Restores original title when all are cleared.
   */
  useEffect(() => {
    const count = newAnomalies.length;
    document.title = count > 0 ? `(${count}) ${ORIGINAL_TITLE}` : ORIGINAL_TITLE;
    // Cleanup: restore original title when unmounting
    return () => {
      document.title = ORIGINAL_TITLE;
    };
  }, [newAnomalies]);

  /**
   * Clear all new anomaly notifications.
   */
  const clearNotifications = useCallback(() => {
    setNewAnomalies([]);
    setLastNotification(null);
    document.title = ORIGINAL_TITLE;
  }, []);

  return {
    connected,
    lastNotification,
    summary,
    newAnomalies,
    clearNotifications,
  };
};

export default useWebSocket;
