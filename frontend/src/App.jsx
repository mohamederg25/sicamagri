/**
 * App — Root Component & Route Definitions (Code-Split)
 * ======================================================
 *
 * All page components are lazy-loaded via React.lazy() to reduce the
 * initial bundle size. A Suspense wrapper with a minimal loading state
 * is rendered while each page chunk loads.
 *
 * Component Tree:
 * 
 *   AuthProvider (context)              
 *        |                               
 *     Router (react-router-dom)        
 *          |                              
 *       AppContent                    
 *        |— SplashScreen (loading)     
 *        |— Login (unauthenticated)     
 *        |— Routes (authenticated)     
 *           Layout                   
 *              Sidebar               
 *              Outlet (page)         
 *          
 *      
 * 
 *
 * Lifecycle:
 *   1. AuthProvider checks for existing JWT cookie → /auth/me
 *   2. If valid, fetches all initial data (pepinieres, lots, etc.)
 *   3. Shows SplashScreen during loading, Login if unauthenticated
 *   4. Once authenticated → renders Layout (sidebar + page content)
 *
 * All pages use useAuth() to access user + appData (cached API data).
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';

// ── Lazy-Loaded Pages (code-split) ──
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Pepinieres = lazy(() => import('./pages/Pepinieres'));
const PepiniereDetail = lazy(() => import('./pages/PepiniereDetail'));
const LotsProduction = lazy(() => import('./pages/LotsProduction'));
const LotDetail = lazy(() => import('./pages/LotDetail'));
const NewProductionLot = lazy(() => import('./pages/NewProductionLot'));
const Varietes = lazy(() => import('./pages/Varietes'));
const Users = lazy(() => import('./pages/Users'));
const Profile = lazy(() => import('./pages/Profile'));
const Semis = lazy(() => import('./pages/Semis'));
const SemisDetail = lazy(() => import('./pages/SemisDetail'));
const NewSemis = lazy(() => import('./pages/NewSemis'));
const ProductionRules = lazy(() => import('./pages/ProductionRules'));
// ProductionPlanningMerged is imported as ActivityLog for /activity route
const History = lazy(() => import('./pages/History'));
const ActivityLog = lazy(() => import('./pages/ProductionPlanningMerged'));
const Supervision = lazy(() => import('./pages/Supervision'));
const StockSemences = lazy(() => import('./pages/StockSemences'));
const StockSemenceDetail = lazy(() => import('./pages/StockSemenceDetail'));
const NewStockSemence = lazy(() => import('./pages/NewStockSemence'));
const NewStockBatch = lazy(() => import('./pages/NewStockBatch'));
const TestsGermination = lazy(() => import('./pages/TestsGermination'));
const SortiesExternes = lazy(() => import('./pages/SortiesExternes'));
const Fournisseurs = lazy(() => import('./pages/Fournisseurs'));
/**
 * AppContent — Authentication-Aware Router
 * -----------------------------------------
 * Renders different content based on auth state:
 *   loading  →  SplashScreen
 *   !user    →  Login form
 *   user     →  Authenticated routes with Layout (sidebar + Outlet)
 */
function AppContent() {
  const { user, loading, dataLoading, appData } = useAuth();

  // Show splash screen while:
  // 1. Checking if user has an existing session (/auth/me)
  // 2. Fetching initial data for authenticated user
  if (loading || (user && (dataLoading || !appData))) {
    return <SplashScreen />;
  }

  // Not authenticated → show login page (wrapped in Suspense for lazy-load safety)
  if (!user) {
    return (
      <Suspense fallback={
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: '#6b7280',
          fontSize: '14px',
          gap: '10px',
          backgroundColor: '#F0F7F0',
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #e5e7eb',
            borderTopColor: '#008030',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }} />
          Chargement…
        </div>
      }>
        <Login />
      </Suspense>
    );
  }

  // Authenticated → render sidebar + all protected routes
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
          {/* Redirect / to /dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Pépinières (Nurseries) */}
          <Route path="pepinieres" element={<Pepinieres />} />
          <Route path="pepinieres/:id" element={<PepiniereDetail />} />
          
          {/* Lots (Seed Batches) */}
          <Route path="lots" element={<Navigate to="/lots/production" replace />} />
          <Route path="lots/production" element={<LotsProduction />} />
          <Route path="lots/:id" element={<LotDetail />} />
          <Route path="lots/new/production" element={<NewProductionLot />} />
          <Route path="lots/new" element={<Navigate to="/lots/new/production" replace />} />
          
          {/* Semis (Seedling Receipts) */}
          <Route path="semis" element={<Semis />} />
          <Route path="semis/new" element={<NewSemis />} />
          <Route path="semis/:id" element={<SemisDetail />} />

          {/* Variétés (Plant Varieties) */}
          <Route path="varietes" element={<Varietes />} />

          {/* Cycles de Semis */}
          <Route path="cycles-de-semis" element={<ProductionRules />} />
          <Route path="production-rules" element={<Navigate to="/cycles-de-semis" replace />} />
          
          {/* Planification Production — merged with Production */}
          <Route path="planning" element={<Navigate to="/activity" replace />} />

          {/* Historique — suivi du cycle complet (semis → test → production → livraison) */}
          <Route path="history" element={<History />} />

          {/* Supervision — anomalies et alertes */}
          <Route path="supervision" element={<Supervision />} />

          {/* Production — résultats de production, récoltes et livraisons */}
          <Route path="activity" element={<ActivityLog />} />
          
          {/* Stock de Semences (Seed Warehouse) */}
          <Route path="stock" element={<StockSemences />} />
          <Route path="stock/new" element={<NewStockSemence />} />
          <Route path="stock/new/batch" element={<NewStockBatch />} />
          <Route path="stock/:id" element={<StockSemenceDetail />} />
          {/* Tests de germination (global view) */}
          <Route path="stock/tests" element={<TestsGermination />} />
          <Route path="tests-germination" element={<TestsGermination />} />
          {/* Sorties Externes */}
          <Route path="sorties-externes" element={<SortiesExternes />} />

          {/* Fournisseurs (Suppliers) */}
          <Route path="fournisseurs" element={<Fournisseurs />} />
          
          {/* User Management */}
          <Route path="users" element={<Users />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Standalone login page (no sidebar) */}
        <Route path="/login" element={<Login />} />
        {/* Catch-all: redirect unknown routes to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
  );
}

/**
 * App — Root Component
 * ---------------------
 * Wraps the entire app in AuthProvider (global state) and Router.
 * AuthProvider must be OUTSIDE Router because useAuth() is called
 * inside AppContent which needs Router context.
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
