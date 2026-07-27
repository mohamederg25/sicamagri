/**
 * PEP (Pépinière) — Backend Server
 * ====================================
 *
 * Architecture overview:
 *   Express 5 REST API  →  Mongoose ODM  →  MongoDB
 *
 *           
 *   Frontend       Express      MongoDB  
 *   (React/Vite)   Controllers  (Atlas)  
 *           
 *        ↕                     ↕
 *   httpOnly JWT         Mongoose Models
 *
 * Authentication: JWT stored in httpOnly cookie (not localStorage).
 * Role-Based Access: 4 roles — admin, ingenieur, employe, visiteur.
 *
 * Each entity follows: routes → controller → model pattern.
 * Middleware chain: protect → authorize → controller handler.
 */

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const connectDB = require('./config/db');
const { initSocketIO } = require('./services/socketService');

dotenv.config();          // Load .env variables (MONGO_URI, JWT_SECRET, PORT)
connectDB();              // Connect to MongoDB (exits process on failure)

const app = express();

//  Security & Performance Middleware 
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin images/fonts
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'ws://*', 'http://*', 'https://*'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    },
  },
}));
app.use(compression());               // Gzip compress all responses

//  Rate Limiting — protect API from abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 2000,                   // limit each IP to 2000 requests per windowMs (~3.3/min burst-friendly)
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de requêtes, veuillez réessayer plus tard' },
});
app.use('/api/', limiter);

//  Body size limit — prevent payload too large
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());          // Parse httpOnly cookies (token retrieval for auth)
// CORS : accepte TOUTES les origines avec credentials
// En production, le frontend et le backend sont souvent sur des ports/domaines différents
// Avec credentials: true, le navigateur n'accepte PAS wildcard (*), on renvoie l'origine exacte
app.use(cors({
  origin: function (origin, callback) {
    // Permet les requêtes sans origin (curl, mobile apps, etc.)
    if (!origin) return callback(null, true);
    callback(null, origin); // Accepte n'importe quelle origine
  },
  credentials: true,
}));

//  Cache Control — disable caching for API responses by default
app.use('/api/', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

//  API Routes 
// Each resource module is self-contained:
//   routes/  →  defines HTTP verbs + URL paths
//   controllers/  →  request handlers with business logic
//   models/  →  Mongoose schemas + virtuals
app.use('/api/auth', require('./routes/authRoutes'));             // Login, register, profile
app.use('/api/pepinieres', require('./routes/pepiniereRoutes'));  // Nursery CRUD + user assignment
app.use('/api/varietes', require('./routes/varieteRoutes'));      // Plant variety CRUD
app.use('/api/lots', require('./routes/lotRoutes'));              // Seed lots + germination tests
app.use('/api/users', require('./routes/userRoutes'));            // User management (admin only)
app.use('/api/semis', require('./routes/semisRoutes'));           // Seedling receipts / stock tracking
app.use('/api/cycles-de-semis', require('./routes/productionRuleRoutes')); // Cycles de semis (production duration rules)
app.use('/api/activity', require('./routes/activityRoutes'));         // Activity log / historique
app.use('/api/production', require('./routes/productionRoutes'));     // Production records
app.use('/api/stock', require('./routes/stockRoutes'));                // Stock de semences (warehouse)
app.use('/api/fournisseurs', require('./routes/fournisseurRoutes'));    // Fournisseurs (suppliers)


// ── Servir le frontend buildé en production ──
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

//  Centralized Error Handler (MUST be after all routes) 
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

//  Graceful Shutdown — close DB & server on SIGTERM/SIGINT
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received — shutting down gracefully...');
  server.close(async () => {
    await mongoose.disconnect();
    console.log('[Server] MongoDB disconnected gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received — shutting down gracefully...');
  server.close(async () => {
    await mongoose.disconnect();
    console.log('[Server] MongoDB disconnected gracefully');
    process.exit(0);
  });
});

//  Create HTTP Server and attach Socket.IO 
const server = http.createServer(app);
initSocketIO(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`WebSocket server ready for real-time notifications`);
});
