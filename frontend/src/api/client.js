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

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api'),
  withCredentials: true,
});

export default client;
