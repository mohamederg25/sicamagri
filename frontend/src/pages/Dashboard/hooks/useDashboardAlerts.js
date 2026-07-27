/**
 * useDashboardAlerts — Alert dismissal state management
 * 
 * Manages dismissed alerts with localStorage persistence.
 */
import { useState, useMemo } from 'react';
import { computeAlerts, loadDismissedAlerts, saveDismissedAlerts, clearDismissedAlerts } from '../../../utils/alertCalculations';

const useDashboardAlerts = (data) => {
  const [dismissedAlerts, setDismissedAlerts] = useState(loadDismissedAlerts);

  const handleDismissAlert = (key) => {
    const updated = new Set(dismissedAlerts);
    updated.add(key);
    setDismissedAlerts(updated);
    saveDismissedAlerts(updated);
  };

  const handleRestoreDismissed = () => {
    setDismissedAlerts(new Set());
    clearDismissedAlerts();
  };

  const alerts = useMemo(() => {
    return computeAlerts(
      data?.lots || [],
      data?.pepinieres || [],
      data?.semis || [],
      data?.stock || [],
      data?.stockHealth
    );
  }, [data]);

  const activeFilteredAlerts = useMemo(() => {
    return alerts.filter(a => !dismissedAlerts.has(a.key));
  }, [alerts, dismissedAlerts]);

  return {
    alerts,
    activeFilteredAlerts,
    dismissedAlerts,
    handleDismissAlert,
    handleRestoreDismissed,
  };
};

export default useDashboardAlerts;
