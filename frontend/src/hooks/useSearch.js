/**
 * useSearch — Reusable Search/Filter Hook
 * =========================================
 *
 * Centralizes the search/filter pattern duplicated across Pepinieres, Varietes,
 * Users, Semis, and Lots pages.
 *
 * Usage:
 *   const { searchTerm, setSearchTerm, filteredData, clearSearch } = useSearch(data, ['nom', 'code']);
 *
 * @param {Array} data - The full dataset to filter
 * @param {string[]} fields - Object keys to search against (e.g., ['nom', 'code', 'email'])
 * @param {Object} [options] - Optional config
 * @param {string} [options.nested] - Nested path prefix (e.g., 'variete.nom' → checks item.variete?.nom)
 * @returns {{ searchTerm, setSearchTerm, filteredData, clearSearch, hasSearch }}
 */
import { useState, useMemo, useCallback } from 'react';

const getNestedValue = (obj, path) => {
  return path.split('.').reduce((acc, key) => {
    if (acc == null) return '';
    return acc[key] != null ? acc[key] : '';
  }, obj);
};

export const useSearch = (data = [], fields = [], options = {}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;

    const q = searchTerm.toLowerCase().trim();
    return data.filter((item) => {
      if (!item) return false;
      return fields.some((field) => {
        const value = options.nested
          ? getNestedValue(item, `${options.nested}.${field}`)
          : item[field];
        return (value && value.toString().toLowerCase().includes(q));
      });
    });
  }, [data, searchTerm, fields, options.nested]);

  const clearSearch = useCallback(() => setSearchTerm(''), []);

  return {
    searchTerm,
    setSearchTerm,
    filteredData,
    clearSearch,
    hasSearch: searchTerm.trim().length > 0,
  };
};

export default useSearch;
