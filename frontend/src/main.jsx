/**
 * Application Entry Point
 * ========================
 *
 * Bootstraps the React app into the DOM.
 *
 * Rendering order:
 *   React.StrictMode → AuthProvider → Router → AppContent
 *                       (context)      (routes)  (logic)
 *
 * See App.jsx for the full component tree.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
