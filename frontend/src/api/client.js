/**
 * Axios API Client
 * =================
 *
 * Pre-configured Axios instance shared across all pages.
 * - baseURL: points to the Express backend at localhost:5000
 * - withCredentials: true — sends httpOnly cookies (JWT) with every request
 *
 * Usage:
 *   import client from '../api/client';
 *   const { data } = await client.get('/pepinieres');
 *   const res = await client.post('/auth/login', { email, password });
 *
 * No auth headers needed — the JWT cookie is sent automatically.
 */

import axios from 'axios';

// Détection automatique de l'URL du backend
// 1. VITE_API_URL si défini (build-time)
// 2. En production: utilise le même hostname que la page mais sur le port 5000
// 3. En dev: localhost:5000
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) {
    const hostname = window.location.hostname;
    return `${window.location.protocol}//${hostname}:5000/api`;
  }
  return 'http://localhost:5000/api';
};

const client = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
});

export default client;
