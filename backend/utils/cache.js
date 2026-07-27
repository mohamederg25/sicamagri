/**
 * Simple In-Memory Cache
 * =======================
 *
 * TTL-based cache for frequently accessed, rarely changed data.
 * Used to reduce database load on read-heavy endpoints.
 *
 * Usage:
 *   const cache = require('../utils/cache');
 *
 *   // Cache a value for 60 seconds
 *   cache.set('pepinieres:all', data, 60000);
 *
 *   // Get cached value
 *   const data = cache.get('pepinieres:all');
 *   if (data) return data;
 *
 *   // Invalidate cache on write operations
 *   cache.del('pepinieres:all');
 *
 *   // Clear all cache (e.g., on startup)
 *   cache.clear();
 *
 * Cache keys follow the convention: <resource>:<action>[:param]
 * Examples:
 *   pepinieres:all
 *   varietes:all
 *   fournisseurs:all
 *   stock:stats
 */

const store = new Map();
const DEFAULT_TTL = 30000; // 30 seconds

/**
 * Set a cache entry with TTL.
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} [ttl] - Time to live in ms (default: 30000)
 */
const set = (key, value, ttl = DEFAULT_TTL) => {
  const entry = {
    data: value,
    expiresAt: Date.now() + ttl,
  };
  store.set(key, entry);
};

/**
 * Get a cache entry. Returns null if expired or not found.
 * Automatically deletes expired entries.
 * @param {string} key - Cache key
 * @returns {*|null} Cached value or null
 */
const get = (key) => {
  const entry = store.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }

  return entry.data;
};

/**
 * Delete a specific cache entry.
 * @param {string} key - Cache key to delete
 */
const del = (key) => {
  store.delete(key);
};

/**
 * Delete all cache entries matching a prefix pattern.
 * @param {string} prefix - Key prefix (e.g., 'pepinieres')
 */
const delPrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
};

/**
 * Clear the entire cache.
 */
const clear = () => {
  store.clear();
};

/**
 * Get cache stats (for monitoring).
 * @returns {{ size: number, keys: string[] }}
 */
const stats = () => {
  const now = Date.now();
  let validCount = 0;
  const keys = [];
  for (const [key, entry] of store) {
    if (now <= entry.expiresAt) {
      validCount++;
      keys.push(key);
    } else {
      store.delete(key); // Clean up expired
    }
  }
  return { size: validCount, keys };
};

module.exports = { set, get, del, delPrefix, clear, stats };
