# PEP — Pépinière Management System

## Workflow Documentation

This document describes how the PEP project works, covering architecture, data flow, and user workflows.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│                    React + Vite                             │
│                                                             │
│   AuthContext ──► Routes ──► Pages ──► Services ──► Axios   │
│                                                             │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP (JWT cookie)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
│                 Express 5 REST API                          │
│                                                             │
│   Routes ──► Controllers ──► Services ──► Models ──► MongoDB │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer     | Technology                     |
|-----------|--------------------------------|
| Frontend  | React 18, Vite, React Router  |
| Backend   | Express 5, Node.js            |
| Database  | MongoDB (Mongoose ODM)        |
| Auth      | JWT (httpOnly cookies)        |
| Security  | bcrypt (password hashing)     |

---

## 2. Project Structure

```
pep/
├── backend/
│   ├── config/
│   │   └── db.js                    # MongoDB connection
│   ├── controllers/                 # Request handlers
│   │   ├── authController.js        # Login, register, profile
│   │   ├── lotController.js         # Seed lot management
│   │   ├── pepiniereController.js   # Nursery CRUD
│   │   ├── productionRecordController.js
│   │   ├── productionRuleController.js
│   │   ├── productionSuiviController.js
│   │   ├── semisController.js       # Seedling receipt tracking
│   │   ├── testController.js        # Germination tests
│   │   ├── userController.js        # User management
│   │   └── varieteController.js     # Variety catalog
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification + role check
│   │   └── errorHandler.js          # Centralized error handling
│   ├── models/                      # Mongoose schemas
│   │   ├── Lot.js                   # Seed batch (test/production)
│   │   ├── Pepiniere.js             # Nursery site
│   │   ├── ProductionRecord.js      # Production tracking
│   │   ├── ProductionRule.js        # Duration rules
│   │   ├── ProductionSuivi.js       # Production follow-up
│   │   ├── Semis.js                 # Seedling receipt
│   │   ├── TestGermination.js       # Germination test results
│   │   ├── User.js                  # User accounts
│   │   └── Variete.js               # Plant variety catalog
│   ├── routes/                      # API endpoints
│   ├── services/                    # Business logic
│   └── server.js                    # Entry point
│
├── frontend/
│   └── src/
│       ├── api/
│       │   └── client.js            # Axios instance (baseURL + cookies)
│       ├── components/              # Shared UI components
│       ├── context/
│       │   └── AuthContext.jsx      # Global state provider
│       ├── pages/                   # Route components
│       ├── services/                # API service functions
│       └── App.jsx                  # Root + routing
│
└── Start-Project.bat / .ps1         # Launch scripts
```

---

## 3. Authentication Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Login   │────────►│  Server  │────────►│ MongoDB  │
│  Form    │         │  (API)   │         │          │
└──────────┘         └────┬─────┘         └──────────┘
                          │
                    ┌─────▼─────┐
                    │  Response │
                    │  Set JWT  │
                    │  cookie   │
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │  Frontend │
                    │  stores   │
                    │  user in  │
                    │  Context  │
                    └───────────┘
```

### Auth Steps

1. **Login**: User submits email/password → `POST /api/auth/login`
2. **Server validates**: Checks credentials, generates JWT
3. **Cookie set**: JWT stored in httpOnly cookie (not accessible via JS)
4. **App state**: `AuthContext` fetches `/auth/me` to verify session
5. **Data fetch**: On successful auth, all app data loaded via `Promise.all()`
6. **Logout**: `POST /api/auth/logout` clears cookie, resets state

### Role-Based Access

| Role       | Permissions                                          |
|------------|------------------------------------------------------|
| `admin`    | Full CRUD on all entities, user management           |
| `ingenieur`| Assigned to specific pepinieres, manages lots/semis  |
| `employe`  | Operational view: semis, pepinieres (limited editing)|
| `visiteur` | Read-only access to most features                    |

---

## 4. Data Models & Relationships

```
┌─────────────────┐       ┌─────────────────┐
│    User         │       │   Pepiniere     │
│  (admin,        │◄─────►│  (Nursery site) │
│   ingenieur,    │  M:N  │                 │
│   employe,      │       │  code: p-001    │
│   visiteur)     │       └────────┬────────┘
└─────────────────┘                │
                                   │ 1:N
                          ┌────────▼────────┐
                          │     Semis       │
                          │ (Seed receipt)  │
                          │  code: S001     │
                          └────────┬────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │ 1:N                         │ 1:N
           ┌────────▼────────┐           ┌────────▼────────┐
           │  Lot (Test)     │           │ Lot (Production)│
           │  code: TG001    │──────────►│  code: PR001    │
           │                 │ parent    │  lotSemenceParent│
           └────────┬────────┘           └────────┬────────┘
                    │                             │
           ┌────────▼────────┐           ┌────────▼────────┐
           │ TestGermination │           │ProductionRecord │
           │  (germ. tests)  │           │  (tracking)     │
           └─────────────────┘           │  code: REC001   │
                                         └─────────────────┘

┌─────────────────┐
│    Variete      │
│ (Plant variety) │
│  code: v-001    │
└─────────────────┘

┌──────────────────┐
│ ProductionRule   │
│ (Duration rules) │
│  code: PR001     │
└──────────────────┘
```

---

## 5. Core Workflows

### 5.1 Nursery (Pépinière) Management

```
Create Pepiniere
      │
      ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Admin      │────►│  Assign     │────►│  Ingenieurs │
│  creates    │     │  Users      │     │  see only   │
│  site       │     │  (M:N)      │     │  assigned   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 5.2 Seed Receipt (Semis) Workflow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Plan Semis  │───►│  Execute     │───►│  Track       │
│  statut:     │    │  statut:     │    │  stock:      │
│  "prevue"    │    │  "en_cours"  │    │  RECU        │
└──────────────┘    └──────────────┘    │  UTILISE     │
                                        │  DISPONIBLE  │
                                        └──────────────┘
```

**Stock Calculation** (computed in controller):
```
RECU       = SUM(semis.quantitePrevue) for (pepiniere, variete)
UTILISE    = SUM(production lots.quantite) for (pepiniere, variete)
DISPONIBLE = max(0, RECU - UTILISE)
```

### 5.3 Production Pipeline

```
Phase 1: Seed Testing
┌────────────┐    ┌────────────┐    ┌────────────┐
│  Receive   │───►│  Create    │───►│  Run       │
│  Seeds     │    │  Test Lot  │    │  Germination│
│  (Semis)   │    │  (TGXXX)   │    │  Tests     │
└────────────┘    └────────────┘    └─────┬──────┘
                                          │
                                          ▼
Phase 2: Production                            │
┌────────────┐    ┌────────────┐    ┌────────────┐
│  Calculate │◄───│  Determine │    │  Measure   │
│  Duration  │    │  Germ Rate │    │  Germ Rate │
│  (Rules)   │    │            │    │            │
└─────┬──────┘    └────────────┘    └────────────┘
      │
      ▼
┌────────────┐    ┌────────────┐    ┌────────────┐
│  Create    │───►│  Track     │───►│  Harvest   │
│  Prod Lot  │    │  Growth    │    │  & Deliver │
│  (PRXXX)   │    │            │    │            │
└────────────┘    └────────────┘    └────────────┘
```

### 5.4 Germination Testing Flow

```
1. Create Lot (type: "test de germination")
   │
   ▼
2. Run Test(s) — TestGermination
   │  - grainesTestes: number of seeds tested
   │  - grainesGermees: number that germinated
   │
   ▼
3. Calculate Rate
   │  rate = (grainesGermees / grainesTestes) × 100
   │
   ▼
4. Create Production Lot (if rate acceptable)
   │  - Links to parent test lot
   │  - Uses calculated or manual rate (tauxManuel)
   │
   ▼
5. Track Production
   │  - ProductionRecord created
   │  - Status: en_cours → termine → livre
   │
   ▼
6. Delivery
      - quantiteLivree tracked
      - dateLivraison recorded
```

---

## 6. Frontend State Management

### AuthContext Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    AuthContext                          │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │    user     │  │   appData   │  │   loading   │   │
│  │  (current)  │  │  (cached)   │  │  (boolean)  │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                         │
│  appData = {                                            │
│    pepinieres: [...],                                   │
│    varietes: [...],                                     │
│    lots: [...],                                         │
│    semis: [...],                                        │
│    productionRecords: [...]                             │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
         │
         │ useAuth() hook
         ▼
┌─────────────────────────────────────────────────────────┐
│                    Any Page Component                   │
│                                                         │
│  const { user, appData, fetchAppData } = useAuth();    │
│                                                         │
│  // Data is already cached — no individual API calls    │
│  // Mutations call fetchAppData() to refresh cache      │
└─────────────────────────────────────────────────────────┘
```

### Data Fetching Strategy

- **On login/load**: All data fetched via `Promise.all()` for instant page navigation
- **On mutation**: After create/update/delete, `fetchAppData()` refreshes the cache
- **Trade-off**: Slower initial load, faster page-to-page navigation

---

## 7. API Endpoints

| Method | Endpoint                      | Description                    |
|--------|-------------------------------|--------------------------------|
| POST   | `/api/auth/login`             | Login, set JWT cookie          |
| POST   | `/api/auth/logout`            | Clear JWT cookie               |
| GET    | `/api/auth/me`                | Get current user               |
| POST   | `/api/auth/register`          | Register new user (admin)      |
| GET    | `/api/pepinieres`             | List nurseries                 |
| POST   | `/api/pepinieres`             | Create nursery                 |
| PUT    | `/api/pepinieres/:id`         | Update nursery                 |
| DELETE | `/api/pepinieres/:id`         | Delete nursery                 |
| GET    | `/api/varietes`               | List varieties                 |
| POST   | `/api/varietes`               | Create variety                 |
| PUT    | `/api/varietes/:id`           | Update variety                 |
| DELETE | `/api/varietes/:id`           | Delete variety                 |
| GET    | `/api/lots`                   | List seed lots                 |
| POST   | `/api/lots`                   | Create seed lot                |
| PUT    | `/api/lots/:id`               | Update seed lot                |
| DELETE | `/api/lots/:id`               | Delete seed lot                |
| GET    | `/api/semis`                  | List seed receipts             |
| POST   | `/api/semis`                  | Create seed receipt            |
| PUT    | `/api/semis/:id`              | Update seed receipt            |
| DELETE | `/api/semis/:id`              | Delete seed receipt            |
| GET    | `/api/cycles-de-semis`        | List production rules          |
| POST   | `/api/cycles-de-semis`        | Create production rule         |
| PUT    | `/api/cycles-de-semis/:id`    | Update production rule         |
| DELETE | `/api/cycles-de-semis/:id`    | Delete production rule         |
| GET    | `/api/suivi-production`       | List production follow-ups (legacy) |
| GET    | `/api/production-records`     | List production records        |
| POST   | `/api/production-records`     | Create production record       |
| PUT    | `/api/production-records/:id` | Update production record       |
| GET    | `/api/users`                  | List users (admin)             |
| POST   | `/api/users`                  | Create user (admin)            |
| PUT    | `/api/users/:id`              | Update user (admin)            |

> **Note**: The `/api/suivi-production` route is legacy. The frontend redirects `/suivi-production` to `/production-records`.

---

## 8. Middleware Chain

Every protected route follows this pattern:

```
Request
   │
   ▼
┌─────────────┐
│  protect()  │  Verifies JWT from httpOnly cookie
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ authorize() │  Checks user role (admin, ingenieur, etc.)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Controller  │  Executes business logic
│ Handler     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Service    │  Data access via Mongoose
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Response   │  Standardized JSON response
└─────────────┘
```

---

## 9. Role-Based Dashboard Views

Each role sees a customized dashboard:

| Role       | Dashboard Title    | KPIs Shown                              |
|------------|--------------------|-----------------------------------------|
| Admin      | Tableau de Bord    | Pepinieres, Varietes, Lots, Semis, Germ |
| Ingenieur  | Suivi Technique    | My Sites, Lots, Semis, Germ Rate        |
| Employe    | Plan de Travail    | Sites, Varieties, Semis, Utilization    |
| Visiteur   | Apercu General     | Sites, Varieties, Lots (read-only)      |

---

## 10. Key Business Rules

1. **Only one test lot per (pepiniere, variete) pair** — enforced in controller
2. **Production lot requires parent test lot** — linked via `lotSemenceParent`
3. **Cascade protection** — cannot delete entities with dependent records
4. **Stock tracking** — semis.quantiteUtilisee decremented when lots are deleted
5. **Production duration** — calculated from ProductionRule at lot creation, stored for history
6. **Germination rates** — computed from TestGermination or manual entry (tauxManuel)

---

## 11. Code Generation

| Entity          | Prefix | Format  | Example  |
|-----------------|--------|---------|----------|
| Pepiniere       | `p-`   | p-XXX   | p-001    |
| Variete         | `v-`   | v-XXX   | v-001    |
| Semis           | `S`    | SXXX    | S001     |
| Lot (Test)      | `TG`   | TGXXX   | TG001    |
| Lot (Production)| `PR`   | PRXXX   | PR001    |
| ProductionRule  | `PR`   | PRXXX   | PR001    |
| ProductionRecord| `REC`  | RECXXX  | REC001   |

---

## 12. Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)

### Setup

```bash
# Backend
cd backend
npm install
# Configure .env with MONGO_URI, JWT_SECRET, PORT
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Environment Variables (.env)

```env
MONGO_URI=mongodb://localhost:27017/pep
JWT_SECRET=your_secret_key
PORT=5000
NODE_ENV=development
```

---

*Last updated: July 2026*
