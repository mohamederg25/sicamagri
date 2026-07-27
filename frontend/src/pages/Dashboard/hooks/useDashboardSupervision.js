/**
 * useDashboardSupervision — Supervision (semis anomalies) data fetching
 * 
 * Manages fetching supervision data with initial load and WebSocket refetch.
 */
import { useState, useEffect } from 'react';
import semisService from '../../../services/semisService';

const useDashboardSupervision = (lastNotification) => {
  const [supervision, setSupervision] = useState([]);
  const [supervisionTrends, setSupervisionTrends] = useState({});
  const [supervisionLoading, setSupervisionLoading] = useState(true);

  // Initial fetch
  useEffect(() => {
    const fetchSupervision = async () => {
      try {
        const { data: resData } = await semisService.getSupervision();
        if (Array.isArray(resData)) {
          setSupervision(resData);
          setSupervisionTrends({});
        } else {
          setSupervision(resData.results || []);
          setSupervisionTrends(resData.trends || {});
        }
      } catch (err) {
        console.error('Dashboard: failed to load supervision data', err);
      } finally {
        setSupervisionLoading(false);
      }
    };
    fetchSupervision();
  }, []);

  // Refetch on anomaly notification
  useEffect(() => {
    if (lastNotification?.anomalies?.length > 0) {
      const refetch = async () => {
        try {
          const { data: resData } = await semisService.getSupervision();
          if (Array.isArray(resData)) {
            setSupervision(resData);
          } else {
            setSupervision(resData.results || []);
            setSupervisionTrends(resData.trends || {});
          }
        } catch (err) {
          console.error('Dashboard: failed to refetch supervision', err);
        }
      };
      refetch();
    }
  }, [lastNotification]);

  return {
    supervision,
    supervisionTrends,
    supervisionLoading,
  };
};

export default useDashboardSupervision;
