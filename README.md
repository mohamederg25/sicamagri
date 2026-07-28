<div align="center">

# 🌱 PEP — Pépinière Management System

**Enterprise-Grade Nursery & Seed Production Management Platform**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io&logoColor=white)](https://socket.io)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**PEP** is a complete, modern web application for managing nurseries, seed lots, germination testing, production planning, and inventory tracking — built for agricultural professionals who demand reliability, real-time insights, and operational efficiency.

> ⚡ **From seed to harvest — track every stage of your nursery production lifecycle.**

---

[✨ Features](#-features) • [📸 Screenshots](#-screenshots) • [🏗️ Architecture](#️-architecture) • [🚀 Quick Start](#-quick-start) • [📖 Documentation](#-documentation) • [🛠️ Tech Stack](#️-tech-stack) • [🤝 Support](#-support)

</div>

---

## ✨ Features

### 🌿 Nursery Management
- **Multi-nursery dashboard** — manage unlimited nurseries with role-based access
- **Employee assignment** — assign workers to specific nurseries with granular permissions
- **Real-time supervision** — monitor all nurseries from a single command center
- **Smart alerts** — automatic anomaly detection with instant notifications

### 📦 Seed Lot & Stock Tracking
- **Complete lot lifecycle** — from reception to production readiness
- **Germination testing** — track test results with pass/fail thresholds
- **Multi-warehouse stock** — manage seed inventory across multiple storage locations
- **Barcode-ready codes** — auto-generated identifiers for physical inventory

### 📊 Production Planning
- **Calendar-based cycles** — define production rules by sowing period
- **Automatic duration calculation** — min/max production days with maturity windows
- **Overlap detection** — intelligent conflict checking between cycles
- **Harvest forecasting** — projected readiness dates based on sowing dates

### 🔔 Real-Time Notifications
- **WebSocket-powered** — instant alerts on anomalies, stock depletion, and transfers
- **Critical & warning levels** — severity-based alerting with sound notifications
- **Browser tab badges** — unread count displayed in page title
- **Persistent notification queue** — last 50 events stored in memory

### 👥 Role-Based Access Control
| Role | Permissions |
|------|------------|
| **Admin** | Full access — manage users, cycles, all nurseries |
| **Ingénieur** | Production rules, lot management, nursery oversight |
| **Employé** | Daily operations — semis, stock, transfers |
| **Visiteur** | Read-only access — dashboards & reports |

### 📈 Export & Reporting
- **Excel export** — one-click data export for all modules
- **Search & filter** — real-time filtering across all views
- **Sortable tables** — click-to-sort on any column
- **Comprehensive history** — full audit trail of all operations

### 📱 Additional Capabilities
- **Supplier management** — vendor directory for seed procurement
- **Variety catalog** — plant variety database with attributes
- **External withdrawals** — track seed movements outside the system
- **Profile management** — user profiles with customizable preferences

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19 + Vite)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Dashboard│ │ Nursery  │ │   Lots   │ │  Production  │  │
│  │  Views   │ │ Manager  │ │  & Stock │ │   Planning   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘  │
│       └────────────┴────────────┴──────────────┘           │
│                        │ Axios (HTTP)                      │
│                        │ Socket.IO Client (WS)             │
└────────────────────────┼───────────────────────────────────┘
                         │
┌────────────────────────┼───────────────────────────────────┐
│               BACKEND (Express 5 + Socket.IO)              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              REST API  /  WebSocket Events           │  │
│  └──────────┬──────────────────────────────────┬────────┘  │
│             │                                  │           │
│  ┌──────────▼──────────┐      ┌────────────────▼─────────┐ │
│  │   Controllers +     │      │   Socket Service         │ │
│  │   Services (Logic)  │      │   Real-time Events       │ │
│  └──────────┬──────────┘      └──────────────────────────┘ │
│             │                                              │
│  ┌──────────▼──────────┐                                   │
│  │   Mongoose Models   │                                   │
│  │   (ODM / ORM)       │                                   │
│  └──────────┬──────────┘                                   │
└─────────────┼──────────────────────────────────────────────┘
              │
┌─────────────▼──────────────────────────────────────────────┐
│                    MongoDB (Atlas / Local)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  Users   │ │Nurseries │ │   Lots   │ │  Production  │  │
│  │          │ │          │ │  & Stock │ │    Rules     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 🔐 Security
- **JWT authentication** via httpOnly cookies (XSS-proof)
- **Role-based middleware** — route-level authorization
- **Helmet security headers** — CSP, XSS, clickjacking protection
- **Rate limiting** — 2,000 req/15min per IP
- **Input validation** — payload size limits & sanitization

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + Vite 6 | Modern SPA with lazy-loaded code splitting |
| **UI** | Lucide Icons + Tailwind CSS | Clean, responsive interface |
| **Charts** | Recharts | Production & activity visualizations |
| **State** | React Context | Global state management |
| **Networking** | Axios + Socket.IO Client | REST API + WebSocket real-time |
| **Backend** | Express 5 | RESTful API server |
| **Database** | MongoDB 7 + Mongoose 9 | Flexible document-oriented storage |
| **Auth** | jsonwebtoken + bcryptjs | Secure password hashing & JWT |
| **Real-time** | Socket.IO 4 | Live notifications & updates |
| **Export** | ExcelJS + jsPDF | Data export to Excel & PDF |

---

## 🚀 Quick Start

### 📋 Prerequisites
- **Node.js** ≥ 18.x
- **MongoDB** ≥ 6.0 (local or Atlas)
- **npm** ≥ 9.x

### 🪟 Windows
```bash
# 1. Clone the repository
git clone https://github.com/mohamederg25/sicamagri.git
cd sicamagri

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Launch everything (double-click or terminal)
Start-Project.bat
```
Opens automatically at **http://localhost:5173** 🎉

### 🐧 Linux / macOS
```bash
# 1. Clone the repository
git clone https://github.com/mohamederg25/sicamagri.git
cd sicamagri

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Launch in development mode
./start.sh --dev
```
Opens automatically at **http://localhost:5173** 🎉

### 🔧 Manual Setup (Any OS)
```bash
# Backend
cd backend
npm install
npm run seed        # Seed demo data
npm run dev         # http://localhost:5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev         # http://localhost:5173
```

### 👤 Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@test.com` | `password123` | **Admin** — Full access |
| `ingenieur1@test.com` | `password123` | **Ingénieur** — Operations |
| `employe1@test.com` | `password123` | **Employé** — Daily tasks |
| `visitor1@test.com` | `password123` | **Visiteur** — Read-only |

---

## ☁️ Production Deployment (Ubuntu)

### Automated Setup
```bash
sudo ./install.sh   # Installs Node.js 18, MongoDB, dependencies
```

### Deploy Application
```bash
cd /var/www
git clone https://github.com/mohamederg25/sicamagri.git
cd sicamagri
./start.sh          # Builds frontend, seeds DB, starts on port 5000
```

### Environment Configuration
Copy and customize environment files:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your settings:
#   PORT=5000
#   MONGO_URI=mongodb://your-mongo-uri/pepiniere
#   JWT_SECRET=your-secure-secret-key
#   NODE_ENV=production
```

---

## 📖 Scripts Reference

| Command | Action |
|---------|--------|
| `./start.sh` | Build + seed + start (production mode) |
| `./start.sh --dev` | Start in development mode |
| `sudo ./install.sh` | Install system dependencies |
| `cd backend && npm run seed` | Seed database with demo data |
| `cd backend && npm run clear` | Clear all database collections |
| `cd backend && npm run dev` | Start backend with hot-reload |
| `cd frontend && npm run build` | Build frontend for production |
| `cd frontend && npm run dev` | Start frontend dev server |

---

## 📁 Project Structure

```
sicamagri/
├── backend/                     # Express API Server
│   ├── config/                  # Database connection
│   ├── controllers/             # Route handlers
│   ├── middleware/              # Auth, error handling
│   ├── models/                  # Mongoose schemas
│   ├── routes/                  # API route definitions
│   ├── scripts/                 # Seed & clear scripts
│   ├── services/                # Business logic
│   ├── utils/                   # Helpers & utilities
│   └── server.js                # Entry point
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── api/                 # Axios client
│   │   ├── components/          # Reusable UI components
│   │   ├── context/             # Auth & app state
│   │   ├── hooks/               # Custom React hooks
│   │   ├── pages/               # Page components (code-split)
│   │   ├── services/            # API service wrappers
│   │   └── utils/               # Date, style, alert helpers
│   ├── index.html
│   └── vite.config.js
├── install.sh                   # Server setup script
├── start.sh                     # Launch script
├── Start-Project.bat            # Windows launcher
├── Start-Project.ps1            # PowerShell launcher
└── seed.sh                      # Standalone seed script
```

---

## 🤝 Support & Contact

<div align="center">

**PEP — Pépinière Management System**  
Built with ❤️ for agricultural professionals

📧 **Email:** [erguiba.mohamed@outlook.com](mailto:erguiba.mohamed@outlook.com)  
🐙 **GitHub:** [@mohamederg25](https://github.com/mohamederg25)  
📄 **License:** MIT — see [LICENSE](LICENSE)

---

⭐ *If you find this project useful, please consider giving it a star!*

</div>
