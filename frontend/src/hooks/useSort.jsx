/**
 * useSort — Reusable Column Sort Hook
 * =====================================
 *
 * Usage:
 *   const { sortedData, sortField, sortDir, handleSort, SortIcon } = useSort(data, { defaultField: 'nom', defaultDir: 'asc' });
 *
 *   // In table header:
 *   <th onClick={() => handleSort('nom')} style={{ cursor: 'pointer' }}>
 *     Nom <SortIcon field="nom" />
 *   </th>
 *
 * @param {Array} data - The full dataset to sort
 * @param {Object} [options]
 * @param {string} [options.defaultField] - Default sort column key
 * @param {'asc'|'desc'} [options.defaultDir='asc'] - Default sort direction
 * @returns {{ sortedData, sortField, sortDir, handleSort, SortIcon }}
 */
import { useState, useMemo, useCallback } from 'react';

const getNestedValue = (obj, path) => {
  return path.split('.').reduce((acc, key) => {
    if (acc == null || acc[key] === undefined) return null;
    return acc[key];
  }, obj);
};

const compareValues = (a, b, field) => {
  const va = getNestedValue(a, field);
  const vb = getNestedValue(b, field);

  // Handle nulls/undefined
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;

  // Numbers
  if (typeof va === 'number' && typeof vb === 'number') return va - vb;

  // Dates
  if (va instanceof Date && vb instanceof Date) return va - vb;

  // Strings (case-insensitive)
  const sa = String(va).toLowerCase();
  const sb = String(vb).toLowerCase();
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
};

export const useSort = (data = [], options = {}) => {
  const { defaultField, defaultDir = 'asc' } = options;
  const [sortField, setSortField] = useState(defaultField || null);
  const [sortDir, setSortDir] = useState(defaultDir);

  const handleSort = useCallback((field) => {
    setSortField((prev) => {
      if (prev === field) {
        // Toggle direction
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return field;
    });
  }, []);

  const sortedData = useMemo(() => {
    if (!sortField) return data;
    const sorted = [...data].sort((a, b) => {
      const result = compareValues(a, b, sortField);
      return sortDir === 'asc' ? result : -result;
    });
    return sorted;
  }, [data, sortField, sortDir]);

  /** Renders ▲ or ▼ indicator for the active sort column */
  const SortIcon = useCallback(
    ({ field, style = {} }) => {
      if (sortField !== field) {
        return <span style={{ opacity: 0.25, marginLeft: 4, fontSize: '0.7em', ...style }}>⇅</span>;
      }
      return (
        <span style={{ marginLeft: 4, fontSize: '0.7em', ...style }}>
          {sortDir === 'asc' ? '▲' : '▼'}
        </span>
      );
    },
    [sortField, sortDir]
  );

  return {
    sortedData,
    sortField,
    sortDir,
    handleSort,
    SortIcon,
  };
};

export default useSort;
