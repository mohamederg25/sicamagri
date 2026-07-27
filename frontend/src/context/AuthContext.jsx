/**
 * AuthContext — Global State Provider
 * ====================================
 *
 * This is the central state management for the entire app.
 * Wraps all components and provides:
 *
 *   user      — Current authenticated user object (null if logged out)
 *   appData   — Cached API data (pepinieres, varietes, lots, semis, phytosanitaire)
 *   loading   — True while checking initial auth status
 *   dataLoading — True while fetching appData
 *
 * Data Fetching Strategy:
 *   On login / page load, ALL data is fetched upfront via Promise.all().
 *   This means every page has instant access to cached data without individual
 *   API calls. The trade-off: slower initial load, faster page navigation.
 *
 * Role-Based Filtering:
 *   The backend already filters data by role (e.g., ingenieur only sees their
 *   assigned pepinieres). The frontend receives pre-filtered data.
 *
 * Auth Flow:
 *   1. App starts → checkLoggedIn() calls GET /auth/me
 *   2. If JWT cookie is valid → setUser(data) + fetchAppData()
 *   3. If no cookie or expired → setUser(null), show Login
 *   4. Login POST → sets httpOnly cookie (handled by browser) → fetchAppData()
 *   5. Logout POST → clears cookie → setUser(null)
 */

import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import authService from '../services/authService';
import pepiniereService from '../services/pepiniereService';
import varieteService from '../services/varieteService';
import lotService from '../services/lotService';
import semisService from '../services/semisService';
import stockService from '../services/stockService';
import fournisseurService from '../services/fournisseurService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  // ── Navbar position preference — persisted per browser via localStorage ──
  const [navbarPosition, setNavbarPosition] = useState(() => {
    return localStorage.getItem('navbarPosition') || 'sidebar';
  });

  const updateNavbarPosition = useCallback((pos) => {
    setNavbarPosition(pos);
    localStorage.setItem('navbarPosition', pos);
  }, []);

  // ── Classic table mode — persisted per browser via localStorage ──
  const [classicMode, setClassicMode] = useState(() => {
    return localStorage.getItem('classicMode') === 'true';
  });

  const toggleClassicMode = useCallback(() => {
    const next = !classicMode;
    setClassicMode(next);
    localStorage.setItem('classicMode', String(next));
  }, [classicMode]);

  const fetchWithFallback = useCallback(async (fetchFn, fallback = []) => {
    try {
      const res = await fetchFn();
      return res.data || fallback;
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message;
      console.error(`[fetchAppData] ${fetchFn.name} returned ${status}: ${message}`);
      return fallback;
    }
  }, []);

  const fetchAppData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [pepinieres, varietes, lots, semis, stock, stockHealth, sicamStats, fournisseurs] = await Promise.all([
        fetchWithFallback(pepiniereService.getAll),
        fetchWithFallback(varieteService.getAll),
        fetchWithFallback(lotService.getAll),
        fetchWithFallback(semisService.getAll),
        fetchWithFallback(stockService.getAll),
        fetchWithFallback(stockService.getHealth),
        fetchWithFallback(stockService.getSicamStats, null),
        fetchWithFallback(fournisseurService.getAll),
      ]);
      setAppData({ pepinieres, varietes, lots, semis, stock, stockHealth, sicamStats, fournisseurs });
    } catch (err) {
      console.error('[fetchAppData] Unexpected error:', err);
      setAppData({ pepinieres: [], varietes: [], lots: [], semis: [], stock: [], stockHealth: null, sicamStats: null, fournisseurs: [] });
    } finally {
      setDataLoading(false);
    }
  }, [fetchWithFallback]);

  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const { data } = await authService.getMe();
        if (data) {
          setUser(data);
          // Fetch app data in parallel for faster initial load
          await fetchAppData();
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkLoggedIn();
  }, [fetchAppData]);

  // ── Periodic alert check every 15 minutes ──
  useEffect(() => {
    if (!user) return;

    // Initial check: fetch stock health and supervision data
    const checkAlerts = async () => {
      try {
        const { data: healthData } = await stockService.getHealth();
        const { data: supervisionData } = await semisService.getSupervision();
        
        // Refresh appData with latest health data
        setAppData((prev) => prev ? {
          ...prev,
          stockHealth: healthData,
          supervision: supervisionData,
        } : prev);
      } catch (err) {
        console.error('[Periodic Check] Failed to fetch alerts:', err);
      }
    };

    // Run initial check
    checkAlerts();

    // Then check every 15 minutes (900,000 ms)
    const interval = setInterval(checkAlerts, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const login = async (email, password) => {
    const { data } = await authService.login(email, password);
    setUser(data);
    // Fetch app data in background — don't block the UI
    fetchAppData();
    return data;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setAppData(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authService.getMe();
      if (data) setUser(data);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const register = async (userData) => {
    const { data } = await authService.register(userData);
    setUser(data);
    fetchAppData();
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, dataLoading, appData, fetchAppData, login, logout, register, refreshUser, navbarPosition, updateNavbarPosition, classicMode, toggleClassicMode }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth — Hook to access authentication context.
 * Usage in any component:
 *   const { user, appData, login } = useAuth();
 */
export const useAuth = () => useContext(AuthContext);
