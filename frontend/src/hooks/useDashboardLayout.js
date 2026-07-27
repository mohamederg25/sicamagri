/**
 * useDashboardLayout — Customizable dashboard layout hook
 * =======================================================
 * Manages widget visibility, grid layout, and persistence per role.
 * Uses localStorage so each user's layout preferences persist.
 */

import { useState, useCallback, useMemo } from 'react';

const STORAGE_PREFIX = 'pep_dash_';

/* ── Widget definitions per role ── */
const WIDGETS = {
  admin: [
    { id: 'kpi-cards',     title: 'Indicateurs',            minW: 4,  defaultW: 12, defaultH: 2.5 },
    { id: 'stock-kpis',    title: 'Stock Glissant — KPIs',   minW: 4,  defaultW: 8,  defaultH: 2.5 },
    { id: 'stock-legend',  title: 'Stock Glissant — Légende', minW: 3,  defaultW: 4,  defaultH: 1.5 },
    { id: 'workflow',      title: 'Pipeline de production',  minW: 4,  defaultW: 12, defaultH: 4 },
    { id: 'pep-stats',     title: 'Pépinières — Statistiques', minW: 6, defaultW: 12, defaultH: 5 },
    { id: 'germ-chart',    title: 'Taux de germination',     minW: 3,  defaultW: 6,  defaultH: 4 },
    { id: 'status-chart',  title: 'Statuts des lots',        minW: 3,  defaultW: 6,  defaultH: 4 },
    { id: 'prod-vol-chart',title: 'Production par variété',  minW: 3,  defaultW: 6,  defaultH: 4.5 },
    { id: 'comparatif',    title: 'Livré vs Planifié',       minW: 4,  defaultW: 12, defaultH: 4.5 },
  ],
  ingenieur: [
    { id: 'kpi-cards',     title: 'Indicateurs',            minW: 4,  defaultW: 12, defaultH: 2.5 },
    { id: 'stock-kpis',    title: 'Stock Glissant — KPIs',   minW: 4,  defaultW: 8,  defaultH: 2.5 },
    { id: 'stock-legend',  title: 'Stock Glissant — Légende', minW: 3,  defaultW: 4,  defaultH: 1.5 },
    { id: 'workflow',      title: 'Pipeline de production',  minW: 4,  defaultW: 12, defaultH: 4 },
    { id: 'pep-stats',     title: 'Pépinières — Statistiques', minW: 6, defaultW: 12, defaultH: 5 },
    { id: 'germ-chart',    title: 'Taux de germination',     minW: 3,  defaultW: 6,  defaultH: 4 },
    { id: 'status-chart',  title: 'Statuts des lots',        minW: 3,  defaultW: 6,  defaultH: 4 },
    { id: 'prod-vol-chart',title: 'Production par variété',  minW: 3,  defaultW: 6,  defaultH: 4.5 },
    { id: 'comparatif',    title: 'Livré vs Planifié',       minW: 4,  defaultW: 12, defaultH: 4.5 },
  ],
  employe: [
    { id: 'kpi-cards',     title: 'Indicateurs',            minW: 4,  defaultW: 12, defaultH: 2.5 },
    { id: 'semis-table',   title: 'Aperçu des Semis',        minW: 4,  defaultW: 12, defaultH: 5 },
    { id: 'germ-chart',    title: 'Taux de germination',     minW: 3,  defaultW: 6,  defaultH: 4 },
    { id: 'status-chart',  title: 'Statuts des lots',        minW: 3,  defaultW: 6,  defaultH: 4 },
    { id: 'comparatif',    title: 'Livré vs Planifié',       minW: 4,  defaultW: 12, defaultH: 4.5 },
  ],
  visiteur: [
    { id: 'kpi-cards',     title: 'Indicateurs',            minW: 4,  defaultW: 12, defaultH: 2.5 },
    { id: 'pep-overview',  title: 'Pépinières',             minW: 4,  defaultW: 12, defaultH: 4 },
    { id: 'var-overview',  title: 'Variétés',               minW: 4,  defaultW: 12, defaultH: 2 },
    { id: 'germ-chart',    title: 'Taux de germination',     minW: 3,  defaultW: 6,  defaultH: 4 },
    { id: 'status-chart',  title: 'Statuts des lots',        minW: 3,  defaultW: 6,  defaultH: 4 },
    { id: 'comparatif',    title: 'Livré vs Planifié',       minW: 4,  defaultW: 12, defaultH: 4.5 },
  ],
};

/**
 * Build a default layout for a given role.
 * Widgets are stacked vertically in order of definition.
 */
function buildDefaultLayout(role) {
  const items = WIDGETS[role] || [];
  let y = 0;
  return items.map((w) => {
    const item = {
      i: w.id,
      x: 0,
      y,
      w: w.defaultW,
      h: w.defaultH,
      minW: w.minW,
      minH: 1.5,
    };
    y += w.defaultH;
    return item;
  });
}

/* ── Available widget IDs per role (for toggle visibility) ── */
function getDefaultVisible(role) {
  return (WIDGETS[role] || []).map((w) => w.id);
}

export default function useDashboardLayout(role) {
  const roles = useMemo(() => role || 'visiteur', [role]);

  const visibleKey = `${STORAGE_PREFIX}visible_${roles}`;
  const layoutKey = `${STORAGE_PREFIX}layout_${roles}`;

  const [customizing, setCustomizing] = useState(false);

  const [visibleWidgets, setVisibleWidgets] = useState(() => {
    try {
      const stored = localStorage.getItem(visibleKey);
      return stored ? JSON.parse(stored) : getDefaultVisible(roles);
    } catch {
      return getDefaultVisible(roles);
    }
  });

  const [layouts, setLayouts] = useState(() => {
    try {
      const stored = localStorage.getItem(layoutKey);
      return stored ? JSON.parse(stored) : buildDefaultLayout(roles);
    } catch {
      return buildDefaultLayout(roles);
    }
  });

  const toggleWidget = useCallback(
    (widgetId) => {
      setVisibleWidgets((prev) => {
        const next = prev.includes(widgetId)
          ? prev.filter((id) => id !== widgetId)
          : [...prev, widgetId];
        try {
          localStorage.setItem(visibleKey, JSON.stringify(next));
        } catch { /* ignore */ }
        return next;
      });
    },
    [visibleKey]
  );

  const onLayoutChange = useCallback(
    (layout) => {
      setLayouts(layout);
      try {
        localStorage.setItem(layoutKey, JSON.stringify(layout));
      } catch { /* ignore */ }
    },
    [layoutKey]
  );

  const resetLayout = useCallback(() => {
    const def = buildDefaultLayout(roles);
    const defVis = getDefaultVisible(roles);
    setLayouts(def);
    setVisibleWidgets(defVis);
    try {
      localStorage.removeItem(layoutKey);
      localStorage.removeItem(visibleKey);
    } catch { /* ignore */ }
  }, [roles]);

  const widgetDefs = useMemo(() => WIDGETS[roles] || [], [roles]);

  const sortedWidgets = useMemo(() => {
    return widgetDefs
      .filter((w) => visibleWidgets.includes(w.id))
      .sort((a, b) => {
        const la = layouts.find((l) => l.i === a.id);
        const lb = layouts.find((l) => l.i === b.id);
        const ya = la ? la.y : 999;
        const yb = lb ? lb.y : 999;
        return ya - yb;
      });
  }, [widgetDefs, visibleWidgets, layouts]);

  return {
    customizing,
    setCustomizing,
    visibleWidgets,
    layouts,
    onLayoutChange,
    toggleWidget,
    resetLayout,
    widgetDefs,
    sortedWidgets,
  };
}
