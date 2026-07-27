# 🌱 SICAM AGRI — Gestion de Pépinière

Application web pour la gestion des pépinières : semis, lots, tests germination, stocks, production.

> Node.js / Express 5 • React 19 • MongoDB • Socket.IO

---

## 🚀 Installation rapide (local)

```bash
# 1. Cloner
git clone https://github.com/mohamederg25/sicamagri.git
cd sicamagri

# 2. Backend
cd backend
npm install
npm run seed        # Crée les données de démo
npm run dev         # http://localhost:5000

# 3. Frontend (autre terminal)
cd frontend
npm install
npm run dev         # http://localhost:5173
```

### Identifiants de connexion

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| `admin@test.com` | `password123` | Admin |
| `ingenieur1@test.com` | `password123` | Ingénieur |
| `employe1@test.com` | `password123` | Employé |
| `visitor1@test.com` | `password123` | Visiteur |

---

## ☁️ Déploiement sur serveur Ubuntu

### 1. Installer les dépendances
```bash
sudo ./install.sh
```
→ Installe Node.js 18, MongoDB, et les prérequis.

### 2. Télécharger le projet
```bash
cd /var/www
git clone https://github.com/mohamederg25/sicamagri.git
cd sicamagri
```

### 3. Lancer tout
```bash
./start.sh
```
→ Auto-seed la base, build le frontend, démarre le backend sur **http://winicari.tn:3000**

---

## 📜 Scripts

| Commande | Action |
|----------|--------|
| `./start.sh` | Build + seed + démarre (production) |
| `./start.sh --dev` | Démarre en mode développement (localhost) |
| `sudo ./install.sh` | Installe Node.js + MongoDB |
| `cd backend && npm run seed` | Seed la base de données |
| `cd backend && npm run clear` | Vide la base de données |

---

## 📁 Structure

```
sicamagri/
├── backend/          # API Express + MongoDB
│   ├── config/       # Configuration DB
│   ├── controllers/  # Routes API
│   ├── models/       # Schémas MongoDB
│   ├── routes/       # Définitions des routes
│   ├── scripts/      # seed, clear
│   ├── services/     # Logique métier
│   └── server.js     # Point d'entrée
├── frontend/         # React + Vite
│   ├── src/          # Code source
│   └── index.html
├── install.sh        # Installation serveur
└── start.sh          # Démarrage
```

---

## 📄 Licence

MIT — voir [LICENSE](LICENSE)
